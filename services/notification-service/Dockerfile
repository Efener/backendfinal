# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install any needed packages
RUN npm install

# Bundle app source
COPY . .

# No port exposure needed as it's a background worker, 
# but the internal health check runs on 3006. 
# We don't map it in docker-compose.

# Define the command to run the app
CMD [ "node", "index.js" ] 