# Setting up the project to work on localhost:
## Backend:
1.**Clone the repository**

Go in whatever directory you want to download the repository and clone it with:
```bash
git clone https://github.com/giovanni-bandinelli/DjangoChannels-React-turn-based-game.git
```

2.**Create and activate a python virtual enviroment**

Navigate to the project's backend directory in your terminal and run the following commands:

   **on Windows:**

```bash
python -m venv venv
venv\Scripts\activate
```
   **on Mac/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```
These commands create a Python virtual environment named 'venv' and activate it, necessary for the next step.

3.**Add requirements**
```bash
pip install -r requirements.txt
```
This ensures that all project dependencies are installed in the virtual environment.

4.**Run migrations**
```bash
python manage.py makemigrations
```
```bash
python manage.py migrate
```

## Frontend:
1. Navigate to the frontend directory and run 
```bash
npm install
```


# Start the application:

to start the application run 
in frontend directory:
```bash
npm run dev
```

and in backend directory, with your python virtual environment activated(venv or whatever you decided to call it):
```bash
python manage.py runserver
```
