# Use a more standard Node.js runtime to avoid SSL issues
FROM node:18-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install any needed packages
RUN npm install

# Bundle app source
COPY . .

# Make port 3004 available to the world outside this container
EXPOSE 3004

# Define the command to run the app
CMD [ "node", "index.js" ] 