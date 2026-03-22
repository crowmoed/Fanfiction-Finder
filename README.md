cd C:\Users\notcr\OneDrive\Desktop\Fanfiction-Finder
docker build -t fanficfinder-backend ./backend
docker tag fanficfinder-backend:latest 473157802304.dkr.ecr.us-east-1.amazonaws.com/fanficfinder-backend:latest
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 473157802304.dkr.ecr.us-east-1.amazonaws.com
docker push 473157802304.dkr.ecr.us-east-1.amazonaws.com/fanficfinder-backend:latest

// use above commands to push out a new ecr image to the backend AWS AppRuner


// update the frontend via github