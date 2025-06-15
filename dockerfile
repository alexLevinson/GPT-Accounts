FROM mcr.microsoft.com/playwright:v1.42.1-focal

LABEL Name="gpt-accounts" \
  Version="1.0.0" \
  Maintainer="alex.levinson13@gmail.com"

WORKDIR /app

# Copy package files and install dependencies
COPY package.json ./
RUN npm install

# Copy rest of the application code
COPY . .

# Default number of accounts to create
ENV NUM_ACCOUNTS=1

# Add account creation script
RUN echo '#!/bin/bash\n'\
  'for ((i=1;i<=${NUM_ACCOUNTS};i++)); do\n'\
  '  echo "Running $i of $NUM_ACCOUNTS"\n'\
  '  npm run start\n'\
  '  echo "Completed account creation $i of $NUM_ACCOUNTS"\n'\
  '  echo "------------------------"\ndone' > create_accounts.sh && \
  chmod +x create_accounts.sh

# Entrypoint
CMD ["./create_accounts.sh"]