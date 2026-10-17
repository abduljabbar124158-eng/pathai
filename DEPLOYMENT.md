# Deploying PathAI to AWS

This mirrors Masterclass 5 ("Deploying the App on AWS"). These steps use
an EC2 instance on the AWS Free Tier, which is enough for a demo/capstone
submission.

## 1. Launch an EC2 instance

1. Log in to the [AWS Console](https://console.aws.amazon.com) → search
   **EC2** → **Launch instance**.
2. Name it (e.g. `pathai-server`).
3. **AMI**: choose **Ubuntu Server 22.04 LTS** (Free tier eligible).
4. **Instance type**: `t2.micro` (Free tier eligible).
5. **Key pair**: create a new key pair, download the `.pem` file, and keep
   it safe — you need it to connect.
6. **Network settings** → Edit → Add a security group rule:
   - Type: `Custom TCP`, Port range: `5000`, Source: `Anywhere (0.0.0.0/0)`
     (this is what lets your browser reach the app — for a real production
     app you'd lock this down, but it's fine for a demo)
   - Also keep the default `SSH` rule (port 22) so you can connect.
7. Click **Launch instance**.

## 2. Connect to your instance

From your terminal (Mac/Linux) or PowerShell/WSL (Windows):

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@<your-instance-public-ip>
```

(Find `<your-instance-public-ip>` on the EC2 dashboard, under your
instance's details.)

## 3. Install dependencies on the server

```bash
sudo apt update
sudo apt install -y python3-pip python3-venv git
```

## 4. Get your code onto the server

Easiest option — upload via `scp` from your own machine (run this from
your **local** terminal, not the SSH session):

```bash
scp -i your-key.pem -r pathai ubuntu@<your-instance-public-ip>:~/pathai
```

(Alternatively, push your code to GitHub and `git clone` it on the server.)

## 5. Set up and run the app

Back in your SSH session:

```bash
cd ~/pathai
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
nano .env    # set AI_PROVIDER and your API key, then Ctrl+O, Enter, Ctrl+X to save
```

Run it with Gunicorn (a production-ready server, instead of Flask's dev
server):

```bash
gunicorn -w 2 -b 0.0.0.0:5000 app:app
```

Visit `http://<your-instance-public-ip>:5000` in your browser — the app
should be live.

## 6. Keep it running after you disconnect

`gunicorn` above stops if you close your SSH session. To keep it running
in the background, use one of:

**Quick option (fine for a demo):**
```bash
nohup gunicorn -w 2 -b 0.0.0.0:5000 app:app > app.log 2>&1 &
```

**Proper option (recommended if you have time):** set it up as a
`systemd` service so it restarts automatically:

```bash
sudo nano /etc/systemd/system/pathai.service
```

Paste:

```ini
[Unit]
Description=PathAI Flask App
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/pathai
Environment="PATH=/home/ubuntu/pathai/venv/bin"
ExecStart=/home/ubuntu/pathai/venv/bin/gunicorn -w 2 -b 0.0.0.0:5000 app:app
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl start pathai
sudo systemctl enable pathai   # auto-start on reboot
```

## 7. For your submission

Take a screenshot of the app running at your EC2 public IP URL, and
include it plus the URL in your project report as evidence of AWS
deployment.

**Note:** free-tier EC2 instances are billed on active hours (limited
free hours/month) and the public IP changes if you stop/restart the
instance (unless you allocate an Elastic IP). Keep the instance running
until after your submission is reviewed, and consider stopping it
afterward to avoid any charges.
