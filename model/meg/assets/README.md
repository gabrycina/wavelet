# Post-scriptum note

Many attempted experiments showecased that we do indeed need a custom decoder model to process the tokens we have in the MEG data.

However, since we could not train one, we resorted to using a pre-trained model. This of course will have to change, since
the internal representation that GPT2 has for certain tokens and their relationship with others is completely different from the one one could have when dealing with numerical quantities, and in particular, MEG data.