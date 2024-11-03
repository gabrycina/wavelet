import os
import torch
from torch import nn
from typing import Optional
from transformers import load_model

class WavesTransformer(nn.Module):
    """
    Transformer model for turning low-spatial resolution EEG data into high-fidelity MEG.
    """
    def __init__(self):
        """
        The choice of relying on pre-trained models is motivated by the somewhat limited
        amount of paired EEG-MEG data recordings sessions available.
        
        Because of this, relying on pre-trained models priors is essential.
        """
        super().__init__()

        self.encoder = load_model("fracapuano/EEGViT")  # custom EEG-data encoder
        self.decoder = load_model("fracapuano/MEG-GPT2")  # GPT2-based decoder model

    def forward(self, eeg_tokens:torch.Tensor, meg_tokens:torch.Tensor) -> torch.Tensor:
        """Forward pass of the EEG2MEG model."""
        eeg_tokens = self.encoder(eeg_tokens)
        meg_tokens = self.encoder(meg_tokens)

        return self.decoder(eeg_tokens, meg_tokens)

    def generate(self, 
                 eeg_tokens:torch.Tensor, 
                 meg_tokens:torch.Tensor,
                 max_tokens:int=100
                ) -> torch.Tensor:
        """
        Autoregressively generate MEG tokens from (1) MEG tokens and (2) EEG tokens.
        Uses greedy sampling from vocabulary.
        """
        eeg_tokens = self.encoder(eeg_tokens)
        
        # Generate tokens autoregressively
        for _ in range(max_tokens):
            next_token = self.decoder(eeg_tokens, meg_tokens)
            # Append the new token to meg_tokens
            meg_tokens = torch.cat([meg_tokens, next_token], dim=1)
            
        return meg_tokens