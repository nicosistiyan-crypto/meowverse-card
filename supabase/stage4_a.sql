-- Stage 4, step 1. Run this ALONE first (new enum values must be committed before they can be used).
alter type tier add value if not exists 'PRIME';
alter type tier add value if not exists 'ABSOLUTE';
