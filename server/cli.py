import click
from sqlalchemy.orm import Session

from app.db.session import engine
from app.models.operator import Operator
from app.security.security import hash_password


def get_db():
    return Session(bind=engine)


@click.group()
def cli():
    pass


@cli.command()
@click.option('--username', prompt='Username', help='Username for the new user')
@click.option('--password', prompt='Password', hide_input=True, help='Password for the new user')
def create(username, password):
    session = get_db()
    try:
        if session.query(Operator).filter(Operator.username == username).first():
            click.echo(f"User '{username}' already exists!")
            return
        
        hashed_password = hash_password(password)
        user = Operator(username=username, hashed_password=hashed_password)
        
        session.add(user)
        session.commit()
        
        click.echo(f"User '{username}' created successfully!")
        
    except Exception as e:
        session.rollback()
        click.echo(f"Error creating user: {e}")
    finally:
        session.close()


@cli.command()
def list():
    session = get_db()
    try:
        users = session.query(Operator).all()
        
        if not users:
            click.echo("No users found.")
            return
        
        click.echo("Users:")
        for user in users:
            click.echo(f"  ID: {user.id} | Username: {user.username}")
            
    except Exception as e:
        click.echo(f"Error listing users: {e}")
    finally:
        session.close()


@cli.command()
@click.option('--username', prompt='Username to delete', help='Username to delete')
@click.confirmation_option(prompt='Are you sure you want to delete this user?')
def delete(username):
    session = get_db()
    try:
        user = session.query(Operator).filter(Operator.username == username).first()
        
        if not user:
            click.echo(f"User '{username}' not found!")
            return
        
        session.delete(user)
        session.commit()
        
        click.echo(f"User '{username}' deleted successfully!")
        
    except Exception as e:
        session.rollback()
        click.echo(f"Error deleting user: {e}")
    finally:
        session.close()


if __name__ == '__main__':
    cli()