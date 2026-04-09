import { trpc } from "@/lib/trpc";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, X, Camera, FileText } from "lucide-react";
import { toast } from "sonner";

interface FileUploadProps {
  /** Called with the uploaded file URL on success */
  onUpload: (url: string) => void;
  /** Current file URL if already uploaded */
  currentUrl?: string | null;
  /** Called when user removes the file */
  onRemove?: () => void;
  /** Accepted file types */
  accept?: string;
  /** Upload folder path in S3 */
  folder?: string;
  /** Display variant */
  variant?: "photo" | "document";
  /** Custom label */
  label?: string;
  /** Max file size in MB */
  maxSizeMB?: number;
  /** Custom class name */
  className?: string;
}

export default function FileUpload({
  onUpload,
  currentUrl,
  onRemove,
  accept = "image/*",
  folder = "uploads",
  variant = "photo",
  label,
  maxSizeMB = 10,
  className = "",
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.upload.complete.useMutation();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File too large. Maximum size is ${maxSizeMB}MB.`);
      return;
    }

    setUploading(true);

    try {
      // Read file as base64
      const base64 = await fileToBase64(file);

      // Upload via tRPC
      const result = await uploadMutation.mutateAsync({
        key: `${folder}/${Date.now()}-${file.name}`,
        contentBase64: base64,
        contentType: file.type,
      });

      // Set preview for images
      if (file.type.startsWith("image/")) {
        setPreview(URL.createObjectURL(file));
      }

      onUpload(result.url);
      toast.success(
        variant === "photo" ? "Photo uploaded!" : "Document uploaded!"
      );
    } catch (err) {
      console.error("Upload failed:", err);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onRemove?.();
  };

  const displayUrl = preview || currentUrl;

  if (variant === "photo") {
    return (
      <div className={`relative inline-block ${className}`}>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
        />

        {displayUrl ? (
          <div className="relative group">
            <img
              src={displayUrl}
              alt="Uploaded"
              className="w-20 h-20 rounded-2xl object-cover border-2 border-muted"
            />
            <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-full bg-white/90 hover:bg-white transition-colors"
                disabled={uploading}
              >
                <Camera className="h-3.5 w-3.5 text-foreground" />
              </button>
              {onRemove && (
                <button
                  onClick={handleRemove}
                  className="p-1.5 rounded-full bg-white/90 hover:bg-white transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-destructive" />
                </button>
              )}
            </div>
            {uploading && (
              <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-20 h-20 rounded-2xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 bg-muted/30 hover:bg-primary/5 flex flex-col items-center justify-center gap-1 transition-colors"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
            ) : (
              <>
                <Camera className="h-5 w-5 text-muted-foreground" />
                <span className="text-[9px] text-muted-foreground font-medium">
                  {label || "Add Photo"}
                </span>
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  // Document variant
  return (
    <div className={`${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {displayUrl ? (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <a
            href={displayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary font-medium truncate hover:underline flex-1"
          >
            View Document
          </a>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-1 rounded hover:bg-muted transition-colors"
              title="Replace"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
            {onRemove && (
              <button
                onClick={handleRemove}
                className="p-1 rounded hover:bg-muted transition-colors"
                title="Remove"
              >
                <X className="h-3.5 w-3.5 text-destructive" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="gap-1.5 h-8 text-xs w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" />{" "}
              {label || "Upload Document"}
            </>
          )}
        </Button>
      )}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
