-- Stage 6, step 1. Run this ALONE first (a new enum value must be committed before it can be used).
alter type tier add value if not exists 'COLLECTOR';
