import torch
from torch.optim import AdamW
from torch.nn import CrossEntropyLoss
from waves_transformer import WavesTransformer
from torch.utils.data import DataLoader
from dataset import EGG2MEG_Dataset
import wandb
from huggingface_hub import Repository
import os


def train_waves_transformer(
    model: WavesTransformer,
    train_dataloader: torch.utils.data.DataLoader,
    num_epochs: int = 10,
    learning_rate: float = 1e-4,
    device: str = "cuda" if torch.cuda.is_available() else "cpu",
    repo_name: str = None,  # HF repo name
    checkpoint_interval: int = 1
):
    # Initialize wandb
    wandb.init(
        project="waves-transformer",
        config={
            "learning_rate": learning_rate,
            "num_epochs": num_epochs,
            "device": device,
        }
    )
    
    # Setup HuggingFace repo if provided
    if repo_name:
        repo = Repository(
            local_dir="checkpoints",
            clone_from=repo_name,
            use_auth_token=True
        )
    
    model = model.to(device)
    optimizer = AdamW(model.parameters(), lr=learning_rate)
    loss_fn = CrossEntropyLoss()
    
    for epoch in range(num_epochs):
        model.train()
        total_loss = 0
        
        for batch_idx, batch in enumerate(train_dataloader):
            eeg_tokens, meg_tokens = batch
            eeg_tokens = eeg_tokens.to(device)
            meg_tokens = meg_tokens.to(device)
            
            # For causal modeling, we use meg_tokens[:, :-1] as input
            # and meg_tokens[:, 1:] as target
            input_meg = meg_tokens[:, :-1]
            target_meg = meg_tokens[:, 1:]
            
            # Zero gradients
            optimizer.zero_grad()
            
            # Forward pass
            # The output should be of shape [batch_size, sequence_length, vocab_size]
            outputs = model(eeg_tokens, input_meg)
            
            # Reshape outputs and targets for loss calculation
            # outputs: [batch_size * sequence_length, vocab_size]
            # target_meg: [batch_size * sequence_length]
            outputs = outputs.view(-1, outputs.size(-1))
            target_meg = target_meg.view(-1)
            
            # Calculate loss
            loss = loss_fn(outputs, target_meg)
            
            # Backward pass and optimize
            loss.backward()
            optimizer.step()
            
            # Log batch loss to wandb
            wandb.log({
                "batch_loss": loss.item(),
                "epoch": epoch,
                "batch": batch_idx
            })
            
            total_loss += loss.item()
        
        avg_loss = total_loss / len(train_dataloader)
        print(f"Epoch {epoch+1}/{num_epochs}, Average Loss: {avg_loss:.4f}")
        
        # Log epoch metrics
        wandb.log({
            "epoch_loss": avg_loss,
            "epoch": epoch
        })
        
        # Save checkpoint to HuggingFace Hub
        if repo_name and (epoch + 1) % checkpoint_interval == 0:
            checkpoint_dir = f"checkpoints/epoch_{epoch+1}"
            os.makedirs(checkpoint_dir, exist_ok=True)
            
            # Save model
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'loss': avg_loss,
            }, f"{checkpoint_dir}/model.pt")
            
            # Push to hub
            repo.push_to_hub(
                commit_message=f"Epoch {epoch+1} checkpoint"
            )

    wandb.finish()


if __name__ == "__main__":
    # Initialize model and prepare data
    model = WavesTransformer()
    
    # DataLoader returning (eeg_tokens, meg_tokens) pairs
    train_dataloader = DataLoader(
        EGG2MEG_Dataset(), batch_size=8, shuffle=True
    )
    
    # Train the model with HF repo
    train_waves_transformer(
        model, 
        train_dataloader,
        repo_name="fracapuano/EEG2MEG"
    )

