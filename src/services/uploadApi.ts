import * as FileSystem from 'expo-file-system/legacy';
import { API_BASE_URL } from './apiClient';

export type ImageUploadType =
  | 'received'
  | 'received_product'
  | 'distribution'
  | 'repair'
  | 'before_repair'
  | 'after_repair'
  | 'replacement_old'
  | 'old_cookstove'
  | 'replacement_new'
  | 'new_cookstove'
  | 'signature'
  | 'profile';

const mapUploadType = (type: ImageUploadType): string => {
  switch (type) {
    case 'received':
    case 'received_product':
      return 'received_product';
    case 'distribution':
      return 'distribution';
    case 'repair':
    case 'before_repair':
      return 'before_repair';
    case 'after_repair':
      return 'after_repair';
    case 'replacement_old':
    case 'old_cookstove':
      return 'old_cookstove';
    case 'replacement_new':
    case 'new_cookstove':
      return 'new_cookstove';
    case 'signature':
      return 'signature';
    case 'profile':
      return 'profile';
    default:
      return 'received_product';
  }
};

export const uploadApi = {
  uploadImage: async (
    fileUri: string,
    imageType: ImageUploadType,
    taskId?: number,
    userId?: number
  ): Promise<string> => {
    // If the image is already a hosted HTTP/HTTPS url, return it directly
    if (fileUri.startsWith('http://') || fileUri.startsWith('https://')) {
      return fileUri;
    }

    let uploadTargetUri = fileUri;
    let tempFilePath: string | null = null;

    try {
      // If it is a base64 data URI (e.g. from signature canvas)
      if (fileUri.startsWith('data:')) {
        const commaIndex = fileUri.indexOf(',');
        const base64Data = commaIndex !== -1 ? fileUri.slice(commaIndex + 1) : fileUri;
        const isPng = fileUri.startsWith('data:image/png');
        const ext = isPng ? 'png' : 'jpg';
        tempFilePath = `${FileSystem.cacheDirectory}upload_${Date.now()}.${ext}`;

        await FileSystem.writeAsStringAsync(tempFilePath, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        uploadTargetUri = tempFilePath;
      }

      const uploadUrl = `${API_BASE_URL}/upload/image.php`;
      const serverType = mapUploadType(imageType);

      const response = await FileSystem.uploadAsync(uploadUrl, uploadTargetUri, {
        fieldName: 'image',
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        parameters: {
          type: serverType,
          ...(taskId ? { task_id: String(taskId) } : {}),
          ...(userId ? { user_id: String(userId) } : {}),
        },
        headers: {
          Accept: 'application/json',
        },
      });

      let data: any;
      try {
        data = JSON.parse(response.body);
      } catch {
        throw new Error(`Upload server responded with non-JSON: ${response.body.slice(0, 100)}`);
      }

      if (!data.success || !data.url) {
        throw new Error(data.error || 'Image upload failed');
      }

      return data.url;
    } finally {
      // Clean up temporary cache file if one was created
      if (tempFilePath) {
        try {
          await FileSystem.deleteAsync(tempFilePath, { idempotent: true });
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  },
};

