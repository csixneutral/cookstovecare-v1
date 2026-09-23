import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';
import { Colors } from '../../constants/theme';
import { MaterialIcons } from '@expo/vector-icons';

interface SignaturePadModalProps {
  visible: boolean;
  onSave: (signatureBase64: string) => void;
  onClose: () => void;
}

export const SignaturePadModal: React.FC<SignaturePadModalProps> = ({
  visible,
  onSave,
  onClose,
}) => {
  const signatureRef = useRef<any>(null);

  const handleOK = (signature: string) => {
    onSave(signature);
    onClose();
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
  };

  const handleConfirm = () => {
    signatureRef.current?.readSignature();
  };

  const style = `
    .m-signature-pad {
      box-shadow: none;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      margin: 0;
      padding: 0;
      height: 100%;
    }
    .m-signature-pad--body {
      border: none;
      border-radius: 12px;
    }
    .m-signature-pad--footer {
      display: none;
    }
    body, html {
      background-color: transparent;
      margin: 0;
      padding: 0;
    }
  `;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Customer Signature</Text>
                <Text style={styles.subtitle}>Sign in the box below to confirm delivery</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Signature Canvas Box */}
            <View style={styles.canvasContainer}>
              <SignatureCanvas
                ref={signatureRef}
                onOK={handleOK}
                webStyle={style}
                autoClear={false}
                imageType="image/png"
                penColor="#000000"
              />
            </View>

            {/* Bottom Actions */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.btn, styles.clearBtn]}
                onPress={handleClear}
              >
                <MaterialIcons name="refresh" size={18} color={Colors.textSecondary} />
                <Text style={styles.clearBtnText}>Clear</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.confirmBtn]}
                onPress={handleConfirm}
              >
                <MaterialIcons name="check" size={18} color={Colors.textWhite} />
                <Text style={styles.confirmBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  canvasContainer: {
    height: 220,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtn: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clearBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textWhite,
    marginLeft: 6,
  },
});
