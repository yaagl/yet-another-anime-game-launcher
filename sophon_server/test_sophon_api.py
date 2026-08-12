import unittest

from endpoints import get_sophon_api_host


class GetSophonApiHostTest(unittest.TestCase):
    def test_cn_update_uses_takumi_patch_endpoint(self):
        self.assertEqual(get_sophon_api_host(True, "cn"), "api-takumi.mihoyo.com")

    def test_overseas_update_keeps_downloader_patch_endpoint(self):
        self.assertEqual(
            get_sophon_api_host(True, "os"), "sg-downloader-api.hoyoverse.com"
        )

    def test_cn_full_download_uses_takumi_endpoint(self):
        self.assertEqual(get_sophon_api_host(False, "cn"), "api-takumi.mihoyo.com")

    def test_overseas_full_download_keeps_public_endpoint(self):
        self.assertEqual(
            get_sophon_api_host(False, "os"), "sg-public-api.hoyoverse.com"
        )


if __name__ == "__main__":
    unittest.main()
