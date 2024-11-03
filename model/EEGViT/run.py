from model_pretrained import EEGViT_pretrained
from helper_functions import split
from dataset import EEGEyeNetDataset
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Subset
from tqdm import tqdm
import numpy as np
from huggingface_hub import HfApi, HfFolder
import os
from datetime import datetime
import wandb

'''
models: EEGViT_pretrained; EEGViT_raw; ViTBase; ViTBase_pretrained
'''
model = EEGViT_pretrained()
EEGEyeNet = EEGEyeNetDataset('./dataset/Position_task_with_dots_synchronised_min.npz')
batch_size = 64
n_epoch = 15
learning_rate = 1e-4

criterion = nn.MSELoss()

# AdamW is recommended for generalization
optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)

# scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=n_epoch, eta_min=1e-5)
scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=6, gamma=0.1)

def train(model, optimizer, scheduler=None, repo_id="your-username/your-repo-name"):
    '''
        model: model to train
        optimizer: optimizer to update weights
        scheduler: scheduling learning rate, used when finetuning pretrained models
        repo_id: Hugging Face Hub repository ID where models will be uploaded
    '''
    torch.cuda.empty_cache()
    print('Number of samples: ', len(EEGEyeNet))
    train_indices, val_indices, test_indices = split(EEGEyeNet.trainY[:,0],0.7,0.15,0.15)  # indices for the training set
    print('create dataloader...')
    criterion = nn.MSELoss()

    train = Subset(EEGEyeNet, indices=train_indices)
    val = Subset(EEGEyeNet, indices=val_indices)
    test = Subset(EEGEyeNet, indices=test_indices)

    # statistics for normalization
    train_elements = []
    for element in train:
        train_elements.append(element[1])
    merg = torch.cat(train_elements).reshape(-1,2)
    min_target = merg.min(dim=0, keepdim=True)[0]
    max_target = merg.max(dim=0, keepdim=True)[0]


    train_loader = DataLoader(train, batch_size=batch_size)
    val_loader = DataLoader(val, batch_size=batch_size)
    test_loader = DataLoader(test, batch_size=batch_size)

    if torch.cuda.is_available():
        gpu_id = 0  # Change this to the desired GPU ID if you have multiple GPUs
        torch.cuda.set_device(gpu_id)
        device = torch.device(f"cuda:{gpu_id}")
    else:
        device = torch.device("cpu")
    if torch.cuda.device_count() > 1:
        model = nn.DataParallel(model)  # Wrap the model with DataParallel
    print("HI")

    model = model.to(device)
    criterion = criterion.to(device)

    # Initialize lists to store losses
    train_losses = []
    val_losses = []
    test_losses = []
    print('training...')
    # Create checkpoint directory
    checkpoint_dir = "checkpoints"
    os.makedirs(checkpoint_dir, exist_ok=True)

    best_val_loss = float('inf')

    # Initialize Hugging Face API
    api = HfApi()

    # Initialize wandb
    wandb.init(
        project="EEGViT",
        config={
            "learning_rate": learning_rate,
            "batch_size": batch_size,
            "n_epochs": n_epoch,
            "model": model.__class__.__name__,
            "optimizer": "Adam",
            "scheduler": "StepLR"  # "CosineAnnealingLR"
        }
    )

    # Train the model
    for epoch in range(n_epoch):
        model.train()
        epoch_train_loss = 0.0

        for i, (inputs, targets, index) in tqdm(enumerate(train_loader)):
            mean = inputs.mean()
            std = inputs.std()

            inputs = (inputs - mean)/(std+1e-8)
            targets = (targets - min_target)/(max_target-min_target+1e-8)

            # Move the inputs and targets to the GPU (if available)
            inputs = inputs.to(device)
            targets = targets.to(device)

            # Compute the outputs and loss for the current batch
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs.squeeze(), targets.squeeze())

            # Compute the gradients and update the parameters
            loss.backward()
            optimizer.step()
            epoch_train_loss += loss.item()

            # Log batch loss
            wandb.log({"MSE_loss": loss.item()})

            # Print the loss and accuracy for the current batch
            if i % 100 == 0:
                print(f"Epoch {epoch}, Batch {i}, Loss: {loss.item()}")

        epoch_train_loss /= len(train_loader)
        train_losses.append(epoch_train_loss)

        # Evaluate the model on the validation set
        model.eval()
        with torch.no_grad():
            val_loss = 0.0
            for inputs, targets, index in val_loader:
                mean = inputs.mean()
                std = inputs.std()

                inputs = (inputs - mean)/(std+1e-8)
                targets = (targets - min_target)/(max_target-min_target+1e-8)

                # Move the inputs and targets to the GPU (if available)
                inputs = inputs.to(device)
                targets = targets.to(device)

                # Compute the outputs and loss for the current batch
                outputs = model(inputs)
                # print(outputs)
                loss = criterion(outputs.squeeze(), targets.squeeze())
                val_loss += loss.item()


            val_loss /= len(val_loader)
            val_losses.append(val_loss)

            print(f"Epoch {epoch}, Val Loss: {val_loss}")

            # After validation loss calculation
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                checkpoint_path = os.path.join(checkpoint_dir, f"model_best.pth")
                torch.save({
                    'epoch': epoch,
                    'model_state_dict': model.state_dict(),
                    'optimizer_state_dict': optimizer.state_dict(),
                    'val_loss': val_loss,
                    'train_loss': epoch_train_loss,
                }, checkpoint_path)

                # Upload to Hugging Face Hub
                try:
                    api.upload_file(
                        path_or_fileobj=checkpoint_path,
                        path_in_repo=f"model_best.pth",
                        repo_id=repo_id,
                        repo_type="model",
                    )
                    print(f"Uploaded best model checkpoint to {repo_id}")
                except Exception as e:
                    print(f"Failed to upload to Hugging Face Hub: {e}")

            # Save periodic checkpoint
            if (epoch + 1) % 5 == 0:  # Save every 5 epochs
                checkpoint_path = os.path.join(checkpoint_dir, f"model_epoch_{epoch+1}.pth")
                torch.save({
                    'epoch': epoch,
                    'model_state_dict': model.state_dict(),
                    'optimizer_state_dict': optimizer.state_dict(),
                    'val_loss': val_loss,
                    'train_loss': epoch_train_loss,
                }, checkpoint_path)

        with torch.no_grad():
            val_loss = 0.0
            for inputs, targets, index in test_loader:
                mean = inputs.mean()
                std = inputs.std()

                inputs = (inputs - mean)/(std+1e-8)
                targets = (targets - min_target)/(max_target-min_target+1e-8)

                # Move the inputs and targets to the GPU (if available)
                inputs = inputs.to(device)
                targets = targets.to(device)

                # Compute the outputs and loss for the current batch
                outputs = model(inputs)

                loss = criterion(outputs.squeeze(), targets.squeeze())
                val_loss += loss.item()

            val_loss /= len(test_loader)
            test_losses.append(val_loss)

            print(f"Epoch {epoch}, test Loss: {val_loss}")

        if scheduler is not None:
            scheduler.step()

        # Log epoch metrics
        wandb.log({
            "epoch": epoch,
            "train_loss": epoch_train_loss,
            "val_loss": val_loss,
            "test_loss": test_losses[-1],
            "learning_rate": optimizer.param_groups[0]['lr']
        })

    # Close wandb run
    wandb.finish()

if __name__ == "__main__":
    # Login to Hugging Face Hub (you'll need to do this once)
    # You can set HUGGING_FACE_HUB_TOKEN environment variable instead
    # HfApi().set_access_token("your-token-here")

    # Login to wandb (you'll need to do this once)
    wandb.login()

    train(model, optimizer=optimizer, scheduler=scheduler, repo_id="fracapuano/EEGViT")
