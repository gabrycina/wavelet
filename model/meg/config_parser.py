import yaml
from dataclasses import dataclass
from typing import List, Optional
from transformers import GPT2Config

@dataclass
class TrainingConfig:
    gpu: str
    project_name: str
    learning_rate: float
    epochs: int
    val_freq: int
    print_freq: int

@dataclass
class DatasetConfig:
    data_path: Optional[str]
    num_channels: int
    shuffle: bool
    whiten: bool
    split: List[float]
    save_data: bool
    dump_data: str
    load_data: str

@dataclass
class SavingConfig:
    result_dir: str
    push_to_hub: bool
    hub_user: str
    model_name: str

class Config:
    def __init__(self, config_path: str):
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        
        # Parse training config
        self.training = TrainingConfig(**config['training'])
        
        # Parse model config
        self.gpt2_config = GPT2Config(**config['model']['gpt2_config'])
        
        # Parse dataset config
        self.dataset = DatasetConfig(**config['dataset'])
        
        # Parse saving config
        self.saving = SavingConfig(**config['saving'])
    
    def to_args(self):
        """Convert config to args-like object for compatibility"""
        class Args:
            pass
        
        args = Args()
        
        # Copy all attributes from configs
        for config in [self.training, self.gpt2_config, self.dataset, self.saving]:
            for key, value in config.__dict__.items():
                setattr(args, key, value)
        
        # Add GPT2 config
        args.gpt2_config = self.gpt2_config
        
        return args
