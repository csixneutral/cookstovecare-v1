import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/theme';
import { MaterialIcons } from '@expo/vector-icons';

interface ImagePickerCardProps {
  label?: string;
  imageUri?: string | null;
  onImageSelected: (uri: string) => void;
  onImageRemoved?: () => void;
  required?: boolean;
  helperText?: string;
}

export const ImagePickerCard: React.FC<ImagePickerCardProps> = ({
  label,
  imageUri,
  onImageSelected,
  onImageRemoved,
  required = false,
  helperText,
}) => {
  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission Required',
        'Camera permission is needed to take a photo of the cookstove.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      onImageSelected(result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission Required',
        'Photo library permission is needed to select an image.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      onImageSelected(result.assets[0].uri);
    }
  };

  const handleOpenPicker = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            pickFromCamera();
          } else if (buttonIndex === 2) {
            pickFromGallery();
          }
        }
      );
    } else {
      Alert.alert('Upload Photo', 'Choose an option', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Camera', onPress: pickFromCamera },
        { text: 'Gallery', onPress: pickFromGallery },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            {label}
            {required ? <Text style={styles.requiredAsterisk}> *</Text> : null}
          </Text>
        </View>
      ) : null}

      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}

      {imageUri ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
          <View style={styles.overlayButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.recaptureButton]}
              onPress={handleOpenPicker}
            >
              <MaterialIcons name="refresh" size={18} color={Colors.textWhite} />
              <Text style={styles.actionButtonText}>Change</Text>
            </TouchableOpacity>

            {onImageRemoved ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.removeButton]}
                onPress={onImageRemoved}
              >
                <MaterialIcons name="delete" size={18} color={Colors.textWhite} />
                <Text style={styles.actionButtonText}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.uploadBox}
          onPress={handleOpenPicker}
        >
          <View style={styles.uploadIconCircle}>
            <MaterialIcons name="add-a-photo" size={24} color={Colors.primary} />
          </View>
          <Text style={styles.uploadTitle}>Tap to capture or select photo</Text>
          <Text style={styles.uploadSubtitle}>Supports Camera & Gallery</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  requiredAsterisk: {
    color: Colors.error,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    borderStyle: 'dashed',
    borderRadius: 14,
    backgroundColor: Colors.surfaceSecondary,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  uploadTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  uploadSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  previewContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
    height: 180,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  overlayButtons: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 6,
  },
  recaptureButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  removeButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
  },
  actionButtonText: {
    color: Colors.textWhite,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});
