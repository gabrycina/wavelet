import os
import numpy as np
from tqdm import tqdm
from pathlib import Path
from typing import List, Union
from sklearn.preprocessing import MaxAbsScaler


class SignalProcessor:
    """Tokenizes signals into a sequence of integers, amenable to transformer models."""

    def __init__(self, 
                 min_val: float = -1, 
                 max_val: float = 1, 
                 num_tokens: int = 255
                ):
        self.min_val = min_val
        self.max_val = max_val
        self.num_tokens = num_tokens
        self.maxabs = MaxAbsScaler()

    def process_matrix(
            self,
            matrix: np.ndarray
    ) -> np.ndarray:
        """
        Preprocess a matrix by clipping, scaling and clipping.
        """
        # normalizing the data
        matrix = self.maxabs.fit_transform(matrix.T)  # (n_samples, n_channels) -> (n_channels, n_samples)

        matrix = np.clip(
            matrix,
            self.min_val,
            self.max_val
        )

        # Normalize to [0, 1]
        signal_normalized = (matrix - self.min_val) / (self.max_val - self.min_val)
        
        # Scale to [1, num_tokens] and round to nearest integer
        tokens = np.round(
            signal_normalized * (self.num_tokens - 1)
        ).astype(int)

        return tokens

