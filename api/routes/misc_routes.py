import time
from flask import Blueprint, jsonify, request, send_file
import io
from api.utils.auth_middleware import require_auth
from api.utils.rate_limiter import rate_limit
try:
    from markdown_pdf import MarkdownPdf, Section
except ImportError:
    MarkdownPdf = None
    Section = None


def create_misc_routes():
    misc_bp = Blueprint("misc", __name__)

    @misc_bp.route("/")
    def health_check():
        return {
            "status": "healthy",
            "message": "Little Wins API is running",
            "timestamp": time.time(),
        }

    @misc_bp.route("/time")
    def get_current_time():
        return {"time": time.time()}

    @misc_bp.route("/export/pdf", methods=["POST"])
    @require_auth
    @rate_limit(max_requests=5, window_minutes=1)
    def export_pdf():
        if not MarkdownPdf:
            return jsonify({"error": "markdown-pdf module not installed"}), 501
            
        data = request.get_json(silent=True)
        if not isinstance(data, dict) or "content" not in data:
            return jsonify({"error": "Content is required"}), 400
            
        content = data.get("content", "")
        if not isinstance(content, str):
            return jsonify({"error": "Content must be a string"}), 400
        if not content.strip():
            return jsonify({"error": "Content is required"}), 400
        if len(content) > 20_000:
            return jsonify({"error": "Content is too long"}), 413
        
        pdf = MarkdownPdf()
        pdf.add_section(Section(content))
        
        out = io.BytesIO()
        pdf.save(out)
        out.seek(0)
        
        return send_file(
            out,
            mimetype="application/pdf",
            as_attachment=True,
            download_name="entry_export.pdf"
        )

    return misc_bp
