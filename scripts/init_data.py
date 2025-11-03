#!/usr/bin/env python3
"""
Script para inicializar dados do sistema de contagem de alunos
Cria usuários de teste e 12 turmas
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def init_database():
    # Conectar ao MongoDB
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["school_meal_tracker"]
    
    print("🗑️  Limpando banco de dados...")
    await db.users.delete_many({})
    await db.classes.delete_many({})
    await db.daily_counts.delete_many({})
    
    # Criar usuário admin
    admin_user = {
        "id": str(uuid.uuid4()),
        "username": "admin",
        "password_hash": pwd_context.hash("admin123"),
        "role": "admin",
        "class_id": None
    }
    await db.users.insert_one(admin_user)
    print("✅ Usuário admin criado (username: admin, password: admin123)")
    
    # Criar 12 turmas
    classes_data = [
        {"name": "Turma 100", "grade": "1º Ano", "shift": "manhã"},
        {"name": "Turma 101", "grade": "1º Ano", "shift": "tarde"},
        {"name": "Turma 102", "grade": "2º Ano", "shift": "manhã"},
        {"name": "Turma 103", "grade": "2º Ano", "shift": "tarde"},
        {"name": "Turma 200", "grade": "3º Ano", "shift": "manhã"},
        {"name": "Turma 201", "grade": "3º Ano", "shift": "tarde"},
        {"name": "Turma 202", "grade": "4º Ano", "shift": "manhã"},
        {"name": "Turma 203", "grade": "4º Ano", "shift": "tarde"},
        {"name": "Turma 300", "grade": "5º Ano", "shift": "manhã"},
        {"name": "Turma 301", "grade": "5º Ano", "shift": "tarde"},
        {"name": "Turma 302", "grade": "6º Ano", "shift": "manhã"},
        {"name": "Turma 303", "grade": "6º Ano", "shift": "tarde"},
    ]
    
    print("\n📚 Criando 12 turmas e líderes...")
    for i, class_data in enumerate(classes_data, 1):
        class_id = str(uuid.uuid4())
        
        # Criar turma
        class_doc = {
            "id": class_id,
            "name": class_data["name"],
            "grade": class_data["grade"],
            "shift": class_data["shift"],
            "leader_user_id": None
        }
        await db.classes.insert_one(class_doc)
        
        # Criar líder para a turma
        leader_username = f"lider{i}"
        leader_user = {
            "id": str(uuid.uuid4()),
            "username": leader_username,
            "password_hash": pwd_context.hash("lider123"),
            "role": "leader",
            "class_id": class_id
        }
        await db.users.insert_one(leader_user)
        
        print(f"   ✓ {class_data['name']} - Líder: {leader_username} (senha: lider123)")
    
    print("\n✅ Inicialização completa!")
    print("\n📝 Credenciais de acesso:")
    print("   Admin: username=admin, password=admin123")
    print("   Líderes: username=lider1 até lider12, password=lider123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(init_database())