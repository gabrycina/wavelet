import torch
import transformers
from transformers import ViTModel
import torch
from torch import nn
import transformers
from torch.utils.data import DataLoader, Dataset, Subset
import numpy as np
import matplotlib.pyplot as plt

from model_pretrained import EEGViT_pretrained
from dataset import EEGEyeNetDataset
from helper_functions import split



EEGEyeNet = EEGEyeNetDataset('/home/admin/EEGViT/dataset/Position_task_with_dots_synchronised_min.npz')

model = EEGViT_pretrained()
model.load_state_dict(torch.load("/home/admin/EEGViT/checkpoints/model_best.pth", weights_only=True)["model_state_dict"])

train_indices, _, test_indices = split(EEGEyeNet.trainY[:,0],0.7,0.15,0.15)
train = Subset(EEGEyeNet,indices=train_indices)
test = Subset(EEGEyeNet,indices=test_indices)

targetss = []
for element in train:
    targetss.append(element[1])

uniti = torch.cat(targetss).reshape(-1,2)
min_target = uniti.min(dim=0, keepdim=True)[0]
max_target = uniti.max(dim=0, keepdim=True)[0]

test_loader = DataLoader(test, batch_size=64)

if torch.cuda.is_available():
    gpu_id = 0  # Change this to the desired GPU ID if you have multiple GPUs
    torch.cuda.set_device(gpu_id)
    device = torch.device(f"cuda:{gpu_id}")
else:
    device = torch.device("cpu")

criterion = nn.MSELoss()

model.to(device)
criterion.to(device)

model.eval()
target_list = []
output_list = []
with torch.no_grad():
    val_loss = 0.0
    for inputs, targets, index in test_loader:
        mean = inputs.mean()  # Shape: [batch_size, 1, 1, 500]
        std = inputs.std()    # Shape: [batch_size, 1, 1, 500]

        # Normalize
        normalized_inputs = (inputs - mean) / (std + 1e-8)
        normalized_targets = (targets - min_target)/(max_target-min_target+1e-8)
        inputs = normalized_inputs.to(device)
        targets = normalized_targets.to(device)

        
        
        outputs = model(inputs)
        target_list.append(targets.squeeze())
        output_list.append(outputs.squeeze())
        # print(f"target: {targets.squeeze()} outputs: {outputs.squeeze()}")
        loss = criterion(outputs.squeeze(), targets.squeeze())
        val_loss += loss.item()
    val_loss /= len(test_loader)
    print(f"Test Loss: {val_loss}")


def plot_two_lists(list1, list2):
    # Convert CUDA tensors to numpy arrays
    if hasattr(list1, 'is_cuda') and list1.is_cuda:
        points1 = list1.cpu().numpy()
    else:
        points1 = np.array(list1)
        
    if hasattr(list2, 'is_cuda') and list2.is_cuda:
        points2 = list2.cpu().numpy()
    else:
        points2 = np.array(list2)
    
    # Create the scatter plot
    plt.figure(figsize=(10, 8))
    
    # Plot first list with dots and numbers
    plt.scatter(points1[:, 0], points1[:, 1], 
               color='blue', marker='o', label='List 1', s=50)
    
    # Add numbers for first list
    for i, (x, y) in enumerate(points1):
        plt.annotate(str(i), (x, y), xytext=(5, 5), textcoords='offset points', 
                    color='blue', fontsize=8)
    
    # Plot second list with crosses and numbers
    plt.scatter(points2[:, 0], points2[:, 1], 
               color='red', marker='x', label='List 2', s=50)
    
    # Add numbers for second list
    for i, (x, y) in enumerate(points2):
        plt.annotate(str(i), (x, y), xytext=(5, 5), textcoords='offset points', 
                    color='red', fontsize=8)
    
    # Add labels and title
    plt.xlabel('X coordinate')
    plt.ylabel('Y coordinate')
    plt.title('Scatter Plot of Two Point Lists')
    plt.legend()
    
    # Add grid
    plt.grid(True, linestyle='--', alpha=0.7)
    
    # Make the plot look square
    plt.axis('equal')
    
    plt.show()

plot_two_lists(target_list[6][:8], output_list[6][:8])
