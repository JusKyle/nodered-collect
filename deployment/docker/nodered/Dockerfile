FROM nodered/node-red:latest

WORKDIR /usr/src/node-red

RUN npm install node-red-contrib-collecting-system

EXPOSE 1880

CMD ["npm", "start"]