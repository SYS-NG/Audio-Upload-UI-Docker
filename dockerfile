# Base image
FROM node:18

RUN apt-get update && apt-get install -y ffmpeg

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose ports for both frontend and backend
EXPOSE 3000 3001

# We'll use a script to start both services
COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]