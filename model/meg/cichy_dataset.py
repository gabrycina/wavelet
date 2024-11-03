import numpy as np 
from torch.utils.data import Dataset
from torch.utils.data import DataLoader



class MEGWaves(Dataset):
    """
    Dataset class for MEG waves. 
    Shape is:
        - (Num recordings, Num channels, Num timepoints)
    """
    def __init__(self, data_path):
        self.data_path = data_path
        self.data = np.load(data_path)
        
    def __len__(self):
        return len(self.data)

    def __getitem__(self, index):
        return self.data[index, :, :]


class CichyDataset:
    """
    Dataset class for Cichy et. al, 2016.
    Reference:
    - https://www.nature.com/articles/srep27755

    """
    def __init__(self, data_path:str='/home/admin/MEGmodel/MEG-gpt/tokenised_data/combined_data.npy'):
        self.data_path = data_path
        self.dataset = MEGWaves(data_path)
    
    def __len__(self):
        return len(self.dataset)
    
    def train_dataloader(self, batch_size:int=32, shuffle:bool=True):
        return DataLoader(self.dataset, batch_size=batch_size, shuffle=shuffle)
    
    def val_dataloader(self, batch_size:int=32, shuffle:bool=False):
        return DataLoader(self.dataset, batch_size=batch_size, shuffle=shuffle)


# example usage
if __name__ == '__main__':
    dataset = CichyDataset()
    print(len(dataset))

    train_loader = dataset.train_dataloader()
    print(len(train_loader))

    print(next(iter(train_loader)).shape)