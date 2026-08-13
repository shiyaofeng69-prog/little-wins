from flask import Blueprint, current_app, jsonify

from api.config import get_config, config_to_public_dict


def create_config_routes():
    bp = Blueprint("config", __name__)

    @bp.get("/config")
    def get_public_config():
        cfg = get_config()
        public_config = config_to_public_dict(cfg)
        public_config["local_login_enabled"] = bool(
            cfg.LOCAL_ACCESS_PASSWORD
            or cfg.ALLOW_PASSWORDLESS_LOCAL_LOGIN
            or current_app.config.get("TESTING")
            or current_app.debug
        )
        return jsonify(public_config)

    return bp
