from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field
import json


class Settings(BaseSettings):
    anthropic_api_key: str = Field(..., env="ANTHROPIC_API_KEY")
    claude_model: str = Field("claude-opus-4-7", env="CLAUDE_MODEL")

    whisper_model: str = Field("large-v3-turbo", env="WHISPER_MODEL")
    whisper_device: str = Field("auto", env="WHISPER_DEVICE")
    whisper_compute_type: str = Field("float16", env="WHISPER_COMPUTE_TYPE")
    use_whisperx: bool = Field(False, env="USE_WHISPERX")

    data_dir: Path = Field(Path("data"), env="DATA_DIR")
    uploads_dir: Path = Field(Path("data/uploads"), env="UPLOADS_DIR")
    transcripts_dir: Path = Field(Path("data/transcripts"), env="TRANSCRIPTS_DIR")
    clips_dir: Path = Field(Path("data/clips"), env="CLIPS_DIR")
    thumbnails_dir: Path = Field(Path("data/thumbnails"), env="THUMBNAILS_DIR")

    caption_config: Path = Field(Path("caption_config.json"), env="CAPTION_CONFIG")

    ffmpeg_hw_accel: str = Field("auto", env="FFMPEG_HW_ACCEL")

    host: str = Field("127.0.0.1", env="HOST")
    port: int = Field(8000, env="PORT")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def ensure_dirs(self) -> None:
        for d in [self.uploads_dir, self.transcripts_dir, self.clips_dir, self.thumbnails_dir]:
            d.mkdir(parents=True, exist_ok=True)

    def load_caption_config(self) -> dict:
        if self.caption_config.exists():
            return json.loads(self.caption_config.read_text())
        return {
            "font_family": "Arial Black",
            "font_size": 90,
            "primary_color": "#FFFFFF",
            "highlight_color": "#FFFF00",
            "outline_color": "#000000",
            "outline_width": 3,
            "shadow_alpha": 0.5,
            "shadow_offset": 1.5,
            "position_y_ratio": 0.65,
            "max_words_per_line": 2,
            "safe_margin_bottom_px": 450,
            "safe_margin_left_px": 60,
            "safe_margin_right_px": 120,
        }


_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
        _settings.ensure_dirs()
    return _settings
