import React from 'react';
import { CadenceAISheet } from '../CadenceAISheet';

interface AskCadenceModalProps {
  visible: boolean;
  onClose: () => void;
  onReplanRequested?: (reason?: string) => void;
}

export const AskCadenceModal: React.FC<AskCadenceModalProps> = (props) => {
  return <CadenceAISheet {...props} />;
};
