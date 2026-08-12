from typing import Literal


def get_sophon_api_host(
    do_update: bool, rel_type: Literal["os", "cn", "bb"]
) -> str | None:
    if rel_type == "cn":
        return "api-takumi.mih" + "oyo.com"
    if rel_type == "os":
        return (
            "sg-downloader-api.ho" + "yoverse.com"
            if do_update
            else "sg-public-api.ho" + "yoverse.com"
        )
    return None
