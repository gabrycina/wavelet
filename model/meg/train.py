import os
import wandb
import torch
import numpy as np
from torch.optim import AdamW
from meg_gpt import MatrixGPT2
from config_parser import Config
from huggingface_hub import HfApi
from cichy_dataset import CichyDataset
from transformers import PreTrainedModel
from torch.nn.parallel import DataParallel

# Add this helper function at the top level
def get_device():
    """Get the device to use for training."""
    if torch.cuda.is_available():
        return torch.device('cuda')
    return torch.device('cpu')

def train_epoch(model, dataloader, optimizer, args, device):
    model.train()
    total_loss = 0
    num_batches = 0
    
    for batch in dataloader:
        # Move data to appropriate device
        inputs = batch.to(device)
        targets = inputs[:, 1:]
            
        logits = model({
            'inputs': inputs,
        })
        
        loss = model.criterion(
            logits.reshape(-1, args.gpt2_config.vocab_size),
            targets.reshape(-1)
        ).mean()
            
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
            
        total_loss += loss.item()
        num_batches += 1
        
    return total_loss / num_batches

def validate(model, dataloader, args, device):
    model.eval()
    total_loss = 0
    num_batches = 0
    
    with torch.no_grad():
        for batch in dataloader:
            inputs = batch['inputs'].to(device)
            targets = batch['targets'].to(device) if 'targets' in batch else inputs
            condition = batch.get('condition', None)
            if condition is not None:
                condition = condition.to(device)
                
            logits = model({
                'inputs': inputs,
                'condition': condition
            })
            
            loss = model.criterion(
                logits.reshape(-1, args.gpt2_config.vocab_size),
                targets.reshape(-1)
            ).mean()
            
            total_loss += loss.item()
            num_batches += 1
            
    return total_loss / num_batches

def main(args):
    # Get device
    device = get_device()
    print(f"Using device: {device}")
    
    # Initialize model and move to device
    model = MatrixGPT2(args.gpt2_config, args).to(device)
    
    # Use DataParallel if multiple GPUs are available
    if torch.cuda.device_count() > 1 and device.type == 'cuda':
        model = DataParallel(model)
        print(f"Using {torch.cuda.device_count()} GPUs!")
    
    # Load dataset
    dataset = CichyDataset()
    train_loader = dataset.train_dataloader(batch_size=8)
    val_loader = dataset.val_dataloader()
    
    optimizer = AdamW(model.parameters(), lr=args.learning_rate)
    
    best_val_loss = float('inf')
    for epoch in range(args.epochs):
        # Train and validate with device
        train_loss = train_epoch(model, train_loader, optimizer, args, device)
        
        # Rest of the training loop remains the same
        wandb.log({
            "train/loss": train_loss,
            "epoch": epoch,
        })
        
        if epoch % args.val_freq == 0:
            val_loss = validate(model, val_loader, args, device)
            # Rest of the validation code remains the same...
    
    wandb.finish()

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', type=str, required=True, help='Path to config YAML file', default='./config.yaml')
    parsed_args = parser.parse_args()
    
    # Load and parse config
    config = Config(parsed_args.config)
    
    # Convert to args format for compatibility
    args = config.to_args()
    
    # Run main training
    main(args)