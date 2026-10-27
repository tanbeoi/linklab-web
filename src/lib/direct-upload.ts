type DirectUploadOptions = {
    uploadUrl: string;
    file: File;
    onProgress: (progress: number) => void;
};

// XMLHttpRequest is intentional here: fetch does not expose upload byte
// progress, while S3's presigned PUT URL works with either transport.
export function uploadToSignedUrl({ uploadUrl, file, onProgress }: DirectUploadOptions) {
    return new Promise<void>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("PUT", uploadUrl);
        request.setRequestHeader("Content-Type", file.type);

        request.upload.onprogress = (event) => {
            if (!event.lengthComputable) return;
            onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
        };
        request.onerror = () => reject(new Error("The image could not be uploaded to storage."));
        request.onabort = () => reject(new Error("The image upload was cancelled."));
        request.onload = () => {
            if (request.status >= 200 && request.status < 300) {
                onProgress(100);
                resolve();
            } else {
                reject(new Error("The image could not be uploaded to storage."));
            }
        };
        request.send(file);
    });
}
