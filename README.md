# Agility Power Fields app

See the docs here: https://agilitycms.com/docs/apps/power-fields

# Installation and Running The App Locally For Development

In order to run this project locally, you'll need to have an agility instance and organization setup. Once you have that, you can follow these steps to run this project locally:

- First you'll need to clone this repo to your local machine and cd into the v1 directory as this is the root of the project.

```bash
git clone https://github.com/agility/agility-cms-app-power-fields.git
code agility-cms-app-power-fields # or open the project in your code editor
cd v1
yarn  # install the dependencies
```

You'll also need to install ngrok to allow agility to access your app locally. To install ngrok

- On Mac:

```bash
brew install ngrok/ngrok/ngrok
```

- On Windows:

```bash
choco install ngrok
```

- On Debian Linux:

```bash
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | \
  sudo gpg --dearmor -o /etc/apt/keyrings/ngrok.gpg && \
  echo "deb [signed-by=/etc/apt/keyrings/ngrok.gpg] https://ngrok-agent.s3.amazonaws.com buster main" | \
  sudo tee /etc/apt/sources.list.d/ngrok.list && \
  sudo apt update && sudo apt install ngrok
```

Once you have ngrok you can run the following command to start your app locally.

```bash
yarn dev
```

This will start the app on http://localhost:3050. Then in a new terminal window run the following command to start ngrok:

```bash
ngrok http http://localhost:3050
```

Ngrok will then output a forwarding url that you can use to setup your app in agility. It will look something like this:

```bash
Forwarding                    https://randomstring.free.app -> http://localhost:3050
```

Then in Agility go to the organization settings at app.agilitycms.com/org/${your-org-code}/apps and select the private apps tab. Click the "Create Private App" button, which will trigger a modal that will allow you to add the details for your app. You'll need a name, the ngrok url, and a description. Once you've added those details, click the "Create" button. This will create a new private app in your organization. You can then click on the install button on the app, and install it into an instance.
