import hashlib
import os
import pathlib
import tempfile
import time
import unittest
from unittest import mock

from cache import CACHE_MAX_AGE, load_cached_file


class CachedFileTest(unittest.TestCase):
	def setUp(self):
		self.temp_dir = tempfile.TemporaryDirectory()
		self.path = pathlib.Path(self.temp_dir.name) / "manifest.zstd"

	def tearDown(self):
		self.temp_dir.cleanup()

	@staticmethod
	def md5(data):
		return hashlib.md5(data).hexdigest()

	def test_interrupted_ttl_refresh_does_not_replace_valid_cache(self):
		cached = b"valid cache"
		self.path.write_bytes(cached)
		old = time.time() - CACHE_MAX_AGE - 1
		os.utime(self.path, (old, old))

		def interrupt(_url, partial):
			pathlib.Path(partial).write_bytes(b"partial")
			raise OSError("connection interrupted")

		with mock.patch("cache.request.urlretrieve", side_effect=interrupt):
			with self.assertRaisesRegex(OSError, "connection interrupted"):
				load_cached_file(
					self.path,
					"https://example.invalid/manifest",
					expected_size=len(cached),
				)

		self.assertEqual(self.path.read_bytes(), cached)
		self.assertEqual(list(self.path.parent.glob("*.part")), [])

	def test_stale_validated_cache_is_reused_without_download(self):
		cached = b"valid cache"
		self.path.write_bytes(cached)
		old = time.time() - CACHE_MAX_AGE - 1
		os.utime(self.path, (old, old))

		with mock.patch("cache.request.urlretrieve") as retrieve:
			was_downloaded = load_cached_file(
				self.path,
				"https://example.invalid/manifest",
				expected_size=len(cached),
				expected_md5=self.md5(cached),
			)

		self.assertFalse(was_downloaded)
		retrieve.assert_not_called()

	def test_stale_size_validated_cache_can_be_reused_by_caller(self):
		cached = b"compressed manifest"
		self.path.write_bytes(cached)
		old = time.time() - CACHE_MAX_AGE - 1
		os.utime(self.path, (old, old))

		with mock.patch("cache.request.urlretrieve") as retrieve:
			was_downloaded = load_cached_file(
				self.path,
				"https://example.invalid/manifest",
				expected_size=len(cached),
				reuse_valid_cache=True,
			)

		self.assertFalse(was_downloaded)
		retrieve.assert_not_called()

	def test_fresh_truncated_cache_is_redownloaded(self):
		downloaded = b"complete manifest"
		self.path.write_bytes(downloaded[:5])

		def download(_url, partial):
			pathlib.Path(partial).write_bytes(downloaded)

		with mock.patch("cache.request.urlretrieve", side_effect=download) as retrieve:
			was_downloaded = load_cached_file(
				self.path,
				"https://example.invalid/manifest",
				expected_size=len(downloaded),
				expected_md5=self.md5(downloaded),
			)

		self.assertTrue(was_downloaded)
		retrieve.assert_called_once()
		self.assertEqual(self.path.read_bytes(), downloaded)

	def test_same_size_wrong_checksum_is_redownloaded(self):
		downloaded = b"right bytes"
		self.path.write_bytes(b"wrong bytes")

		def download(_url, partial):
			pathlib.Path(partial).write_bytes(downloaded)

		with mock.patch("cache.request.urlretrieve", side_effect=download) as retrieve:
			load_cached_file(
				self.path,
				"https://example.invalid/manifest",
				expected_size=len(downloaded),
				expected_md5=self.md5(downloaded),
			)

		retrieve.assert_called_once()
		self.assertEqual(self.path.read_bytes(), downloaded)

	def test_force_cache_failure_does_not_delete_cache(self):
		cached = b"invalid"
		self.path.write_bytes(cached)

		with self.assertRaisesRegex(IOError, "missing or invalid"):
			load_cached_file(
				self.path,
				"https://example.invalid/manifest",
				expected_size=100,
				expected_md5="0" * 32,
				force_use_cache=True,
			)

		self.assertEqual(self.path.read_bytes(), cached)


if __name__ == "__main__":
	unittest.main()
