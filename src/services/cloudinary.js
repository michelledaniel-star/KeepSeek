// Cloudinary configuration and upload service
const CLOUD_NAME = 'dg5pprmpg';
const UPLOAD_PRESET = 'everheld';

// Upload image to Cloudinary
export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  // Detect resource type based on file type
  let resourceType = 'image';
  if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
    resourceType = 'video'; // Cloudinary uses 'video' for both video and audio
  }

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Cloudinary error:', errorData);
      throw new Error(errorData.error?.message || 'Upload failed');
    }

    const data = await response.json();
    return {
      url: data.secure_url,
      publicId: data.public_id,
    };
  } catch (error) {
    console.error('Error uploading:', error);
    throw error;
  }
}

// Upload multiple images
export async function uploadImages(files) {
  try {
    const uploads = await Promise.all(
      Array.from(files).map(file => uploadImage(file))
    );
    return uploads;
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    throw error;
  }
}
