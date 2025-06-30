# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json from the api-gateway directory
COPY api-gateway/package*.json ./

# Install any needed packages
RUN npm install

# Copy the local source code from the api-gateway directory
COPY api-gateway/ .

# Also copy the services folder so swagger can read the annotations
COPY services/ ./services

# Make port 3000 available to the world outside this container
EXPOSE 3000

# Define the command to run the app
CMD [ "node", "index.js" ] 