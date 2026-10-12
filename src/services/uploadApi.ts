import * as FileSystem from 'expo-file-system/legacy';
import { firebaseConfig, firebaseStoragePath } from '../config/firebase';
import { getUserFacingError } from '../utils/userFacingError';

export type ImageUploadType =
  | 'received'
  | 'received_product'
  | 'distribution'
  | 'repair'
  | 'after_repair'
  | 'replacement_old'
  | 'old_cookstove'
  | 'replacement_new'
  | 'new_cookstove'
  | 'signature'
  | 'profile';

const mapStorageFolder = (type: ImageUploadType): string => {
  switch (type) {
    case 'received':
    case 'received_product':
      return firebaseStoragePath.receivedProduct;
    case 'distribution':
      return firebaseStoragePath.distribution;
    case 'repair':
    case 'after_repair':
      return firebaseStoragePath.afterRepair;
    case 'replacement_old':
    case 'old_cookstove':
      return firebaseStoragePath.oldCookstove;
    case 'replacement_new':
    case 'new_cookstove':
      return firebaseStoragePath.newCookstove;
    case 'signature':
      return firebaseStoragePath.signature;
    case 'profile':
      return firebaseStoragePath.profile;
    default:
      return firebaseStoragePath.receivedProduct;
  }
};

const extensionFromUri = (uri: string): string => {
  if (uri.includes('.png') || uri.startsWith('data:image/png')) return 'png';
  if (uri.includes('.webp') || uri.startsWith('data:image/webp')) return 'webp';
  if (uri.includes('.gif') || uri.startsWith('data:image/gif')) return 'gif';
  return 'jpg';
};

const contentTypeForExt = (ext: string): string => {
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
};

/** Ensure we have a local file path Expo FileSystem can upload (handles data: URIs). */
const ensureLocalFileUri = async (
  uri: string
): Promise<{ localUri: string; ext: string; cleanup?: string }> => {
  if (uri.startsWith('data:')) {
    const commaIndex = uri.indexOf(',');
    const header = uri.slice(0, Math.max(commaIndex, 0));
    const base64 = commaIndex !== -1 ? uri.slice(commaIndex + 1) : uri;
    const ext = header.includes('image/png') ? 'png' : extensionFromUri(uri);
    const tempPath = `${FileSystem.cacheDirectory}firebase_upload_${Date.now()}.${ext}`;
    await FileSystem.writeAsStringAsync(tempPath, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return { localUri: tempPath, ext, cleanup: tempPath };
  }

  return { localUri: uri, ext: extensionFromUri(uri) };
};

const buildDownloadUrl = (objectPath: string, downloadToken: string): string => {
  const bucket = firebaseConfig.storageBucket;
  const encodedPath = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media&token=${downloadToken}`;
};

/**
 * Upload via Firebase Storage REST + Expo FileSystem.
 * Avoids Firebase JS SDK Blob/ArrayBuffer issues on React Native.
 */
const uploadLocalFileToFirebase = async (
  localUri: string,
  objectPath: string,
  contentType: string
): Promise<string> => {
  const bucket = firebaseConfig.storageBucket;
  const uploadUrl =
    `https://firebasestorage.googleapis.com/v0/b/${bucket}/o` +
    `?uploadType=media&name=${encodeURIComponent(objectPath)}`;

  const result = await FileSystem.uploadAsync(uploadUrl, localUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      'Content-Type': contentType,
    },
  });

  let data: any;
  try {
    data = JSON.parse(result.body);
  } catch {
    throw new Error(`Upload server responded with non-JSON (HTTP ${result.status})`);
  }

  if (result.status < 200 || result.status >= 300) {
    const code = data?.error?.message || data?.error || `HTTP ${result.status}`;
    throw Object.assign(new Error(String(code)), { code: data?.error?.status || code });
  }

  const token = data?.downloadTokens;
  if (!token) {
    throw new Error('Upload succeeded but no download token was returned');
  }

  return buildDownloadUrl(objectPath, token);
};

export const uploadApi = {
  uploadImage: async (
    fileUri: string,
    imageType: ImageUploadType,
    taskId?: number,
    userId?: number
  ): Promise<string> => {
    // Already a hosted URL — keep as-is (legacy server or Firebase)
    if (fileUri.startsWith('http://') || fileUri.startsWith('https://')) {
      return fileUri;
    }

    let cleanupPath: string | undefined;

    try {
      const prepared = await ensureLocalFileUri(fileUri);
      cleanupPath = prepared.cleanup;

      const folder = mapStorageFolder(imageType);
      // Koshal/cookstovecare/{type}/{id}.{ext}
      const idParts: string[] = [];
      if (taskId) idParts.push(`task${taskId}`);
      if (userId) idParts.push(`user${userId}`);
      idParts.push(`${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);
      const fileId = idParts.join('_');
      const objectPath = `${folder}/${fileId}.${prepared.ext}`;

      return await uploadLocalFileToFirebase(
        prepared.localUri,
        objectPath,
        contentTypeForExt(prepared.ext)
      );
    } catch (error) {
      console.warn('Firebase image upload failed', error);
      throw new Error(
        getUserFacingError(error, 'Unable to upload photo. Please check your connection and try again.')
      );
    } finally {
      if (cleanupPath) {
        try {
          await FileSystem.deleteAsync(cleanupPath, { idempotent: true });
        } catch {
          // ignore cleanup errors
        }
      }
    }
  },
};
