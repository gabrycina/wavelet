import mne
import numpy as np
import matplotlib.pyplot as plt
import scipy
import torch
from torch import nn
from torch.utils.data import DataLoader, Dataset, Subset
import os
import random
import transformers
from transformers import ViTModel
import transformers

# Transform Class for the dataset
class ColumnSplitTransform:
    def __init__(self, num_splits):
        self.num_splits = num_splits
    
    def __call__(self, x):
        if not isinstance(x, torch.Tensor):
           x = torch.tensor(x)
           
        num_cols = x.shape[-1]
        base_split_size = num_cols // self.num_splits
        remainder = num_cols % self.num_splits
        
        target_split_size = base_split_size + (1 if remainder > 0 else 0)

        total_target_cols = target_split_size * self.num_splits
        padding_needed = total_target_cols - num_cols
        
        if padding_needed > 0:
            # Create padding tensor
            pad_shape = list(x.shape)
            pad_shape[-1] = padding_needed
            padding = torch.zeros(pad_shape, dtype=x.dtype, device=x.device)
            
            # Concatenate padding
            x = torch.cat([x, padding], dim=-1)
        
        # Now split into equal parts
        return torch.split(x, target_split_size, dim=-1)


# data is coming from https://openfmri.org/dataset/ds000117/
class EGG2MEG_Dataset(Dataset):
    def __init__(self, base_path, transform=None, max_participants=None, max_column_size=546_700):
        self.max_column_size = max_column_size
        root_tree = os.path.join(base_path, "ds000117_R1.0.0/derivatives/meg_derivatives")
        # data per participant
        participants = [ name for name in os.listdir(root_tree) if os.path.isdir(os.path.join(root_tree, name)) ]
        participants = sorted(participants)

        if max_participants is not None:
            max_participants = min(max_participants, len(participants))
            participants = participants[:max_participants]
        
        # for each participant we want to extract all the .fif files
        self.raws = []
        for participant in participants:
            path = os.path.join(root_tree, participant, "ses-meg/meg")
            fif_files = [ name for name in os.listdir(path) if ".fif" in name ]
            fif_files = sorted(fif_files)

            for fif_file in fif_files:
                try:
                    raw = mne.io.read_raw_fif(os.path.join(path, fif_file), preload=True, verbose=False)
                    eeg = self._adding_rows(
                        self._padding_and_crop(raw.get_data(picks='eeg'), self.max_column_size)
                    )
                    meg = self._padding_and_crop(raw.get_data(picks='meg'), self.max_column_size)
                    print(f"Shape of eeg_data: {eeg.shape}, meg_data {meg.shape}")
                    
                    if not isinstance(eeg, torch.Tensor):
                        eeg = torch.tensor(eeg).float()
                    if not isinstance(meg, torch.Tensor):
                        meg = torch.tensor(meg).float()
                        
                    if transform is not None:
                        eegs = transform(eeg)
                        megs = transform(meg)
                        for tupla in zip(eegs, megs):
                            self.raws.append(tupla)
                    else:
                        self.raws.append((eeg, meg))
                except Exception as error:
                    pass

            self.random_indexes = list(range(len(self.raws)))
            random.shuffle(self.random_indexes)

    def _padding_and_crop(self, matrix, column_size):
        current_columns = matrix.shape[1]
        target_columns = self.max_column_size

        if current_columns > target_columns:
            matrix = matrix[:, :target_columns]
        elif current_columns < target_columns:
            padding_width = target_columns - current_columns
            zero_padding = np.zeros((matrix.shape[0], padding_width))
            matrix = np.hstack((matrix, zero_padding))
        return matrix

    def _adding_rows(self,matrix):
        padding_needed = 129 - 74  # 55 rows needed
        return np.pad(matrix, ((0, padding_needed), (0, 0)), mode='constant', constant_values=0)
        
    def __len__(self):
        return len(self.raws)

    def __getitem__(self, idx):
        return (*self.raws[idx], self.raws[self.random_indexes[idx]][1])

