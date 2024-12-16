"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { Play, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/toaster";
import { ShareButton } from "@/components/ShareButton";
import { useToast } from "@/hooks/use-toast";

interface Video {
  id: string;
  title: string;
  upvotes: number;
  smlImg: string;
  bigImg: string;
  hasUpvoted: boolean;
}

const REFRESH_INTERVAL_MS = 8000; // Changed to 8 seconds from invalid 10 * 800

export default function Dashboard() {
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);
  const [videoQueue, setVideoQueue] = useState<Video[]>([]);
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const extractVideoId = (url: string) => {
    const regex =
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setNewVideoUrl(url);
    const videoId = extractVideoId(url);
    setPreviewVideoId(videoId);
  };

  const handleSubmit = async () => {
    const videoId = extractVideoId(newVideoUrl);
    if (!videoId) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`
      );
      const data = await response.json();

      if (!data.title) {
        throw new Error("Invalid video URL");
      }

      const newVideo: Video = {
        id: videoId,
        title: data.title,
        upvotes: 0,
        smlImg: data.thumbnail_url || `/api/placeholder/120/90`,
        bigImg: data.thumbnail_url || `/api/placeholder/480/360`,
        hasUpvoted: false,
      };

      setVideoQueue((prev) => [...prev, newVideo]);
      setNewVideoUrl("");
      setPreviewVideoId(null);
    } catch (error) {
      console.error("Error fetching video info:", error);
      // Here you might want to show an error toast to the user
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (video: Video, index: number) => {
    try {
      const newQueue = [...videoQueue];
      const increment = video.hasUpvoted ? -1 : 1;

      newQueue[index] = {
        ...video,
        upvotes: video.upvotes + increment,
        hasUpvoted: !video.hasUpvoted,
      };

      // Sort by upvotes
      newQueue.sort((a, b) => b.upvotes - a.upvotes);
      setVideoQueue(newQueue);

      // API call
      const res = await axios.post(
        `/api/streams/${video.hasUpvoted ? "downvote" : "upvote"}`,
        {
          streamId: video.id,
        }
      );
      toast({
        title: res.data.message
          ? "Successfully Upvoted !!"
          : "Successfully Downvoted !!",
      });
    } catch (error) {
      console.error("Error voting:", error);
      // Revert the optimistic update if the API call fails
      refreshStreams();
    }
  };

  const playNext = () => {
    if (videoQueue.length > 0) {
      setCurrentVideo(videoQueue[0].id);
      setVideoQueue((prev) => prev.slice(1));
    }
  };

  const refreshStreams = async () => {
    try {
      const res = await axios.get("/api/streams/my");
      const userStreams = res?.data?.streams;
      if (Array.isArray(userStreams)) {
        setVideoQueue(userStreams);
      }
    } catch (error) {
      console.error("Error refreshing streams:", error);
    }
  };

  useEffect(() => {
    refreshStreams();
    const intervalId = setInterval(refreshStreams, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Song Voting Queue</h1>
        <ShareButton />
      </div>

      {/* Current Video Player */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Now Playing</h2>
        {currentVideo ? (
          <div className="aspect-video">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${currentVideo}?autoplay=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="aspect-video bg-gray-100 flex items-center justify-center rounded">
            <p className="text-gray-500">No video playing</p>
          </div>
        )}
      </div>

      {/* Video Submission */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Submit a Song</h2>
        <div className="flex gap-2 mb-2">
          <Input
            type="text"
            placeholder="Enter YouTube URL"
            value={newVideoUrl}
            onChange={handleUrlChange}
            disabled={isLoading}
          />
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !previewVideoId}
          >
            {isLoading ? "Submitting..." : "Submit"}
          </Button>
        </div>
        {previewVideoId && (
          <div className="aspect-video max-w-sm">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${previewVideoId}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </div>

      {/* Video Queue */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Upcoming Songs</h2>
        {videoQueue.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No songs in queue</p>
        ) : (
          <ul className="space-y-2">
            {videoQueue.map((video, index) => (
              <li
                key={video.id}
                className="flex items-center justify-between bg-gray-100 p-2 rounded"
              >
                <div className="flex items-center gap-2">
                  <Image
                    src={video.smlImg}
                    alt={video.title}
                    width={90}
                    height={68}
                    className="rounded"
                  />
                  <span className="font-medium">{video.title}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleVote(video, index)}
                  className="flex items-center gap-1.5"
                >
                  <span>{video.upvotes}</span>
                  {!video.hasUpvoted ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {videoQueue.length > 0 && (
          <Button className="mt-4" onClick={playNext}>
            <Play className="h-4 w-4 mr-2" />
            Play Next
          </Button>
        )}
      </div>
      <Toaster />
    </div>
  );
}
