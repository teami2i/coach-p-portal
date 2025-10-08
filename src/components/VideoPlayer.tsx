import { useEffect, useState } from "react";

interface VideoPlayerProps {
  lesson: {
    id: string;
    video_url: string;
    video_file_path?: string;
  };
  getVideoUrl: (lesson: any) => Promise<string>;
}

export const VideoPlayer = ({ lesson, getVideoUrl }: VideoPlayerProps) => {
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVideo = async () => {
      setLoading(true);
      const url = await getVideoUrl(lesson);
      setVideoSrc(url);
      setLoading(false);
    };
    loadVideo();
  }, [lesson.id, lesson.video_url, lesson.video_file_path]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // If it's an uploaded video (not a URL), use HTML5 video player
  if (lesson.video_file_path && !lesson.video_url) {
    return (
      <video
        src={videoSrc}
        className="w-full h-full"
        controls
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
      >
        Your browser does not support the video tag.
      </video>
    );
  }

  // For embedded videos (YouTube, Vimeo, Loom)
  return (
    <iframe
      src={videoSrc}
      className="w-full h-full"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      sandbox="allow-scripts allow-same-origin allow-presentation"
    />
  );
};
