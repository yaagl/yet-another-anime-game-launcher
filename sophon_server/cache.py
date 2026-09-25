import hashlib
import os
import shutil
import time
import uuid
import urllib.request as request


CACHE_MAX_AGE = 24 * 3600


def validate_cached_file(path, expected_size=None, expected_md5=None):
	if not path.is_file():
		return False

	if expected_size is not None and path.stat().st_size != expected_size:
		return False

	if expected_md5 is not None:
		digest = hashlib.md5()
		with path.open("rb") as fh:
			for block in iter(lambda: fh.read(1024 * 1024), b""):
				digest.update(block)
		if digest.hexdigest().lower() != expected_md5.lower():
			return False

	return True


def load_cached_file(path, url, post_data=None, expected_size=None,
	                 expected_md5=None, force_use_cache=False,
	                 reuse_valid_cache=False):
	cache_valid = validate_cached_file(path, expected_size, expected_md5)

	if force_use_cache:
		if not cache_valid:
			raise IOError(f"Cached file is missing or invalid: {path}")
		return False

	if cache_valid:
		# Checksummed files are content-validated and do not expire by age.
		if expected_md5 is not None or reuse_valid_cache:
			return False
		if time.time() - path.stat().st_mtime <= CACHE_MAX_AGE:
			return False

	if callable(url):
		url = url()

	partial = path.with_name(f".{path.name}.{uuid.uuid4().hex}.part")
	try:
		if post_data is not None:
			req = request.Request(url, data=post_data)
			with request.urlopen(req) as resp, partial.open("wb") as fh:
				shutil.copyfileobj(resp, fh)
		else:
			request.urlretrieve(url, partial)

		if not validate_cached_file(partial, expected_size, expected_md5):
			actual_size = partial.stat().st_size if partial.is_file() else None
			raise IOError(
				f"Downloaded file validation failed: {path.name}; "
				f"expected_size={expected_size}, actual_size={actual_size}, "
				f"expected_md5={expected_md5}"
			)

		os.replace(partial, path)
		return True
	finally:
		partial.unlink(missing_ok=True)
