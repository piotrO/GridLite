import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ImageBrowser } from "@/components/ImageBrowser";
import { VideoPlayerModal } from "@/components/VideoPlayerModal";
import { MediaGeneratorModal } from "@/components/MediaGeneratorModal";
import { FontPickerModal } from "@/components/FontPickerModal";
import { RenameModal } from "@/components/RenameModal";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { VideoCard } from "@/components/VideoCard";
import { SoundCard } from "@/components/SoundCard";
import { FontCard } from "@/components/FontCard";
import { AssetToolbar } from "@/components/AssetToolbar";
import { Image, Video, Type, Music } from "lucide-react";

const mockImages = [
  "https://images.unsplash.com/photo-1557821552-17105176677c?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=400&h=400&fit=crop",
  "https://images.unsplash.com/photo-1491553895911-0055uj3hG04?w=400&h=400&fit=crop",
];

interface VideoAsset {
  id: string;
  name: string;
  thumbnail: string;
}

interface FontAsset {
  name: string;
  category: string;
}

interface SoundAsset {
  id: string;
  name: string;
  duration: string;
}

const initialVideos: VideoAsset[] = [
  {
    id: "v1",
    name: "Product Demo.mp4",
    thumbnail:
      "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400&h=400&fit=crop",
  },
  {
    id: "v2",
    name: "Brand Story.mp4",
    thumbnail:
      "https://images.unsplash.com/photo-1536240478700-b869070f9279?w=400&h=400&fit=crop",
  },
];

const initialFonts: FontAsset[] = [
  { name: "Inter", category: "Sans-serif" },
  { name: "Playfair Display", category: "Serif" },
  { name: "Roboto", category: "Sans-serif" },
];

const initialSounds: SoundAsset[] = [
  { id: "s1", name: "Upbeat Background.mp3", duration: "2:34" },
  { id: "s2", name: "Notification Chime.wav", duration: "0:03" },
];

type AssetType = "images" | "videos" | "fonts" | "sounds";

interface AssetsGridProps {
  onSelectImage?: (imageUrl: string) => void;
  selectable?: boolean;
}

export function AssetsGrid({
  onSelectImage,
  selectable = false,
}: AssetsGridProps) {
  const [images, setImages] = useState(mockImages);
  const [videos, setVideos] = useState<VideoAsset[]>(initialVideos);
  const [fonts, setFonts] = useState<FontAsset[]>(initialFonts);
  const [sounds, setSounds] = useState<SoundAsset[]>(initialSounds);
  const [assetType, setAssetType] = useState<AssetType>("images");

  // Modal states
  const [selectedVideo, setSelectedVideo] = useState<VideoAsset | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const [editingFontIndex, setEditingFontIndex] = useState<number | null>(null);
  const [showVideoGenerator, setShowVideoGenerator] = useState(false);
  const [showSoundGenerator, setShowSoundGenerator] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{
    type: "video" | "sound";
    id: string;
    name: string;
  } | null>(null);

  const assetCounts = {
    images: images.length,
    videos: videos.length,
    fonts: fonts.length,
    sounds: sounds.length,
  };

  // Video handlers
  const handleVideoClick = (video: VideoAsset) => {
    setSelectedVideo(video);
    setShowVideoModal(true);
  };

  const handleDeleteVideo = (id: string) =>
    setVideos(videos.filter((v) => v.id !== id));
  const handleDeleteFont = (name: string) =>
    setFonts(fonts.filter((f) => f.name !== name));
  const handleDeleteSound = (id: string) => {
    setSounds(sounds.filter((s) => s.id !== id));
    if (playingSound === id) setPlayingSound(null);
  };

  const handleToggleSound = (id: string) =>
    setPlayingSound(playingSound === id ? null : id);

  const handleFontClick = (index: number) => {
    setEditingFontIndex(index);
    setShowFontPicker(true);
  };

  const handleFontChange = (newFont: string) => {
    if (editingFontIndex !== null) {
      const updatedFonts = [...fonts];
      updatedFonts[editingFontIndex] = { name: newFont, category: "Custom" };
      setFonts(updatedFonts);
    }
    setShowFontPicker(false);
    setEditingFontIndex(null);
  };

  const handleUploadVideo = () => {
    const newVideo: VideoAsset = {
      id: `v${Date.now()}`,
      name: `Uploaded Video ${videos.length + 1}.mp4`,
      thumbnail:
        "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&h=400&fit=crop",
    };
    setVideos([newVideo, ...videos]);
  };

  const handleUploadSound = () => {
    const newSound: SoundAsset = {
      id: `s${Date.now()}`,
      name: `Uploaded Sound ${sounds.length + 1}.mp3`,
      duration: "1:00",
    };
    setSounds([newSound, ...sounds]);
  };

  const handleVideoGenerated = (media: {
    id: string;
    name: string;
    thumbnail?: string;
    duration: string;
  }) => {
    const newVideo: VideoAsset = {
      id: media.id,
      name: media.name,
      thumbnail:
        media.thumbnail ||
        "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&h=400&fit=crop",
    };
    setVideos([newVideo, ...videos]);
  };

  const handleSoundGenerated = (media: {
    id: string;
    name: string;
    duration: string;
  }) => {
    setSounds([
      { id: media.id, name: media.name, duration: media.duration },
      ...sounds,
    ]);
  };

  const handleRenameVideo = (id: string, currentName: string) => {
    setRenameTarget({ type: "video", id, name: currentName });
    setShowRenameModal(true);
  };

  const handleRenameSound = (id: string, currentName: string) => {
    setRenameTarget({ type: "sound", id, name: currentName });
    setShowRenameModal(true);
  };

  const handleRenameConfirm = (newName: string) => {
    if (!renameTarget) return;
    if (renameTarget.type === "video") {
      setVideos(
        videos.map((v) =>
          v.id === renameTarget.id ? { ...v, name: newName } : v
        )
      );
    } else {
      setSounds(
        sounds.map((s) =>
          s.id === renameTarget.id ? { ...s, name: newName } : s
        )
      );
    }
    setRenameTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Header with asset type filter */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Your Assets</h2>
          <p className="text-sm text-muted-foreground">
            {assetCounts[assetType]} {assetType} available
          </p>
        </div>

        <ToggleGroup
          type="single"
          value={assetType}
          onValueChange={(value) => value && setAssetType(value as AssetType)}
          className="bg-muted/50 p-1 rounded-lg"
        >
          <ToggleGroupItem
            value="images"
            aria-label="Images"
            className="gap-2 px-3"
          >
            <Image className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Images</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="videos"
            aria-label="Videos"
            className="gap-2 px-3"
          >
            <Video className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Videos</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="fonts"
            aria-label="Fonts"
            className="gap-2 px-3"
          >
            <Type className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Fonts</span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="sounds"
            aria-label="Sounds"
            className="gap-2 px-3"
          >
            <Music className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Sounds</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Images View */}
      {assetType === "images" && (
        <ImageBrowser
          images={images}
          onImagesChange={setImages}
          selectable={selectable}
          onSelectImage={onSelectImage}
          maxHeight="600px"
          showRename={true}
        />
      )}

      {/* Videos View */}
      {assetType === "videos" && (
        <div className="space-y-4">
          <AssetToolbar
            onGenerateAI={() => setShowVideoGenerator(true)}
            onUpload={handleUploadVideo}
          />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <AnimatePresence>
              {videos.map((video) => (
                <VideoCard
                  key={video.id}
                  id={video.id}
                  name={video.name}
                  thumbnail={video.thumbnail}
                  onClick={() => handleVideoClick(video)}
                  onDelete={() => handleDeleteVideo(video.id)}
                  onRename={() => handleRenameVideo(video.id, video.name)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Fonts View */}
      {assetType === "fonts" && (
        <div className="grid gap-3">
          <AnimatePresence>
            {fonts.map((font, index) => (
              <FontCard
                key={font.name}
                name={font.name}
                category={font.category}
                onClick={() => handleFontClick(index)}
                onDelete={() => handleDeleteFont(font.name)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Sounds View */}
      {assetType === "sounds" && (
        <div className="space-y-4">
          <AssetToolbar
            onGenerateAI={() => setShowSoundGenerator(true)}
            onUpload={handleUploadSound}
          />
          <div className="grid gap-3">
            <AnimatePresence>
              {sounds.map((sound) => (
                <SoundCard
                  key={sound.id}
                  id={sound.id}
                  name={sound.name}
                  duration={sound.duration}
                  isPlaying={playingSound === sound.id}
                  onTogglePlay={() => handleToggleSound(sound.id)}
                  onDelete={() => handleDeleteSound(sound.id)}
                  onRename={() => handleRenameSound(sound.id, sound.name)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Modals */}
      <VideoPlayerModal
        open={showVideoModal}
        onOpenChange={setShowVideoModal}
        video={selectedVideo}
      />
      <FontPickerModal
        open={showFontPicker}
        onOpenChange={setShowFontPicker}
        currentFont={
          editingFontIndex !== null
            ? fonts[editingFontIndex]?.name || "Inter"
            : "Inter"
        }
        onFontChange={handleFontChange}
        brandFonts={fonts.map((f) => f.name)}
      />
      <MediaGeneratorModal
        open={showVideoGenerator}
        onOpenChange={setShowVideoGenerator}
        mediaType="video"
        onMediaGenerated={handleVideoGenerated}
      />
      <MediaGeneratorModal
        open={showSoundGenerator}
        onOpenChange={setShowSoundGenerator}
        mediaType="sound"
        onMediaGenerated={handleSoundGenerated}
      />
      <RenameModal
        open={showRenameModal}
        onOpenChange={setShowRenameModal}
        currentName={renameTarget?.name || ""}
        onRename={handleRenameConfirm}
        type={renameTarget?.type || "video"}
      />
    </div>
  );
}
