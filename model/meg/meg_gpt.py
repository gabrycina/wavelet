"""
MegGPT, a GPT2-like model for multi-channel EEG autogressive generation.
Mainly inspired on:
- https://arxiv.org/pdf/2404.09256v1
"""

import torch
from torch.nn import CrossEntropyLoss, Embedding, Linear, Module
from transformers.models.gpt2.modeling_gpt2 import GPT2Model

class MatrixEmbeddings(Module):
    def __init__(self, args):
        super().__init__()
        self.args = args
        
        # Per-token embedding vectors
        self.token_embedding = Embedding(args.vocab_size, 768)  # token ~ quant
        
        # Per-channel embedding vectors
        self.channel_embedding = Embedding(args.num_channels, 768)
        
        # Initialize weights
        self.apply(self._init_weights)
        
    def _init_weights(self, module):
        if isinstance(module, Embedding):
            module.weight.data.normal_(mean=0.0, std=0.02)
            
    def forward(self, x, ids, condition=None, subject_ids=None):
        # Get embeddings for inputs
        x = self.token_embedding(x)  # B x C x T -> B x C x T x E
        
        channel_ids = torch.arange(
            self.args.num_channels, 
            dtype=torch.long,
            device=x.device
        )
        
        # Get channel embeddings
        channel_emb = self.channel_embedding(
            channel_ids[ids]
        ).unsqueeze(0).unsqueeze(2) # 1 x C x 1 x E
        
        # Add channel embeddings
        x = x + channel_emb  # at last, B x C x T x E
            
        return x

class OutputHead(Module):
    def __init__(self, config, num_channels, out_times):
        super().__init__()
        self.out_times = out_times
        self.num_channels = num_channels
        
        # Output projection
        self.head = Linear(config.n_embd, config.vocab_size, bias=False)
        self.head.weight.data.normal_(mean=0.0, std=0.02)
        
    def forward(self, x):
        x = self.head(x)  # B*C x T x vocab_size
        return x[:, -self.out_times:, :]

class MatrixGPT2(Module):
    def __init__(self, config, args):
        super().__init__()
        self.args = args
        self.num_channels = args.num_channels
        self.quant_levels = args.gpt2_config.vocab_size
        self.out_times = 1
        
        # Core components
        self.gpt2 = GPT2Model(args.gpt2_config)
        self.embeddings = MatrixEmbeddings(args)
        self.head = OutputHead(args.gpt2_config, self.num_channels, self.out_times)
        
        # Loss functions
        self.criterion = CrossEntropyLoss()
    
    @torch.no_grad()
    def forward(self, data):
        x = data['inputs']  # B x C x T
        
        # Get embeddings
        x = self.embeddings(
            x, 
            range(self.num_channels)
        )
        
        # Reshape to process with GPT2
        batch_size, channels, seq_len, emb_dim = x.shape
        x = x.reshape(batch_size * channels, seq_len, emb_dim)
        
        # Process in chunks of 100 batches
        chunk_size = 100
        all_logits = []
        
        for i in range(0, x.shape[0], chunk_size):
            # Get chunk
            chunk = x[i:i + chunk_size]
            
            # GPT2 forward pass for chunk
            chunk_outputs = self.gpt2(inputs_embeds=chunk)
            
            # Get logits from LM head
            chunk_logits = self.head(chunk_outputs[0])
            
            all_logits.append(chunk_logits)
        
        # Concatenate all chunks
        logits = torch.cat(all_logits, dim=0)
        
        # Reshape output
        logits = logits.reshape(batch_size, channels, logits.shape[1], -1)
        
        return logits

    def generate(self, input_ids, max_length, condition=None):
        self.eval()
        with torch.no_grad():
            batch_size, channels, seq_len = input_ids.shape
            curr_ids = input_ids
            
            for _ in range(max_length):
                # Forward pass
                outputs = self.forward({
                    'inputs': curr_ids,
                    'condition': condition
                })
                
                # Sample next token for each channel
                next_token_logits = outputs[:, :, -1, :]
                next_tokens = torch.argmax(next_token_logits, dim=-1)
                
                # Append to sequence
                curr_ids = torch.cat([curr_ids, next_tokens.unsqueeze(-1)], dim=-1)
                
            return curr_ids