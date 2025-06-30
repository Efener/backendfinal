import axios from 'axios';

const API = axios.create({
  // We point to the port of our API Gateway
  // In a production environment, this would be your domain name
  baseURL: 'http://localhost:3000/api/v1',
});

export default API; 