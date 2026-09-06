import hashlib
import pathlib
import tempfile
import unittest
from unittest import mock

import zstandard

from cache import load_cached_file
from manifest_cache import decode_manifest, load_manifest_with_retry


class FakeManifest:
	def ParseFromString(self, data):
		self.data = data


class ManifestCacheTest(unittest.TestCase):
	def setUp(self):
		self.temp_dir = tempfile.TemporaryDirectory()
		self.path = pathlib.Path(self.temp_dir.name) / "manifest"

	def tearDown(self):
		self.temp_dir.cleanup()

	def test_download_failure_preserves_existing_manifest(self):
		cached = b"old manifest"
		expected = b"new manifest"
		self.path.write_bytes(cached)

		def interrupt(_url, partial):
			pathlib.Path(partial).write_bytes(b"partial")
			raise OSError("connection interrupted")

		def load_path():
			load_cached_file(
				self.path,
				"https://example.invalid/manifest",
				expected_size=len(expected),
				expected_md5=hashlib.md5(expected).hexdigest(),
			)
			return self.path

		with mock.patch("cache.request.urlretrieve", side_effect=interrupt):
			with self.assertRaisesRegex(OSError, "connection interrupted"):
				load_manifest_with_retry(
					load_path, self.path, 0, len(expected), FakeManifest,
					False, lambda _message: None,
				)

		self.assertEqual(self.path.read_bytes(), cached)

	def test_force_cache_decode_failure_does_not_delete_cache(self):
		cached = b"invalid"
		self.path.write_bytes(cached)

		with self.assertRaisesRegex(IOError, "size mismatch"):
			load_manifest_with_retry(
				lambda: self.path, self.path, 0, 100, FakeManifest,
				True, lambda _message: None,
			)

		self.assertEqual(self.path.read_bytes(), cached)

	def test_decode_failure_deletes_cache_and_retries(self):
		valid = b"valid"
		self.path.write_bytes(b"bad")
		load_count = 0

		def load_path():
			nonlocal load_count
			load_count += 1
			if load_count == 2:
				self.path.write_bytes(valid)
			return self.path

		manifest = load_manifest_with_retry(
			load_path, self.path, 0, len(valid), FakeManifest,
			False, lambda _message: None,
		)

		self.assertEqual(load_count, 2)
		self.assertEqual(manifest.data, valid)

	def test_decode_zstd_manifest(self):
		manifest_bytes = b"manifest protobuf bytes"
		compressed = zstandard.ZstdCompressor().compress(manifest_bytes)
		self.path.write_bytes(compressed)

		manifest = decode_manifest(
			self.path, 1, len(manifest_bytes), FakeManifest,
			expected_md5=hashlib.md5(manifest_bytes).hexdigest(),
		)

		self.assertNotEqual(
			hashlib.md5(compressed).hexdigest(),
			hashlib.md5(manifest_bytes).hexdigest(),
		)
		self.assertEqual(manifest.data, manifest_bytes)

	def test_decompressed_checksum_failure_deletes_cache_and_retries(self):
		valid = b"valid manifest"
		self.path.write_bytes(zstandard.ZstdCompressor().compress(b"wrong manifest"))
		load_count = 0

		def load_path():
			nonlocal load_count
			load_count += 1
			if load_count == 2:
				self.path.write_bytes(zstandard.ZstdCompressor().compress(valid))
			return self.path

		manifest = load_manifest_with_retry(
			load_path, self.path, 1, len(valid), FakeManifest,
			False, lambda _message: None,
			expected_md5=hashlib.md5(valid).hexdigest(),
		)

		self.assertEqual(load_count, 2)
		self.assertEqual(manifest.data, valid)


if __name__ == "__main__":
	unittest.main()
