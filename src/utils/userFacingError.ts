/**
 * Convert technical/API/Firebase errors into short messages safe for Alert modals.
 */
export const getUserFacingError = (
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
): string => {
  const raw =
    typeof error === 'string'
      ? error
      : typeof (error as any)?.message === 'string'
        ? (error as any).message
        : '';

  const message = raw.trim();
  if (!message) return fallback;

  const lower = message.toLowerCase();
  const code = String((error as any)?.code || '').toLowerCase();

  if (
    code.includes('storage/unauthorized') ||
    code.includes('storage/unauthenticated') ||
    lower.includes('storage/unauthorized') ||
    lower.includes('permission') ||
    lower.includes('unauthorized')
  ) {
    return 'Photo upload is not allowed right now. Please try again later.';
  }

  if (
    code.includes('storage/canceled') ||
    lower.includes('storage/canceled') ||
    lower.includes('network') ||
    lower.includes('failed to fetch') ||
    lower.includes('timeout') ||
    lower.includes('offline')
  ) {
    return 'Network issue while uploading. Check your internet and try again.';
  }

  if (
    code.includes('storage/quota') ||
    lower.includes('quota') ||
    lower.includes('too large') ||
    lower.includes('file_too_large')
  ) {
    return 'This photo is too large. Please choose a smaller image.';
  }

  if (
    code.includes('storage/invalid') ||
    lower.includes('invalid_file') ||
    lower.includes('unable to read image')
  ) {
    return 'Could not read this photo. Please pick or capture the image again.';
  }

  // Raw backend / Firebase technical codes
  if (
    lower.includes('server_error') ||
    lower.includes('internal') ||
    /^[a-z0-9_:-]+$/i.test(message) ||
    message.includes('FirebaseError') ||
    message.includes('Firebase Storage')
  ) {
    return fallback;
  }

  // Already a human sentence from uploadApi / app code
  if (message.length <= 160 && !message.includes('{') && !message.includes('http')) {
    return message;
  }

  return fallback;
};
