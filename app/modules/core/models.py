from app import db

class Area(db.Model):
    __tablename__ = 'areas'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    icon = db.Column(db.String(50), default='box')
    color = db.Column(db.String(100), default='#6366f1')
    status = db.Column(db.String(20), default='Activo')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'icon': self.icon,
            'color': self.color,
            'status': self.status
        }

class Platform(db.Model):
    __tablename__ = 'platforms'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    area_id = db.Column(db.Integer, db.ForeignKey('areas.id'), nullable=False)
    direct_link = db.Column(db.String(255))
    icon = db.Column(db.String(50), default='box')
    logo_url = db.Column(db.String(255), nullable=True)
    bg_color = db.Column(db.String(20), default='#6366f1')
    text_color = db.Column(db.String(20), default='#ffffff')
    status = db.Column(db.String(20), default='Activo')
    visits = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=db.func.now())

    # Relationships
    area = db.relationship('Area', backref=db.backref('platforms', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'area_id': self.area_id,
            'icon': self.icon,
            'direct_link': self.direct_link,
            'logo_url': self.logo_url,
            'bg_color': self.bg_color,
            'text_color': self.text_color,
            'status': self.status,
            'user_ids': [u.id for u in self.users]
        }

class AccessRequest(db.Model):
    __tablename__ = 'access_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    platform_id = db.Column(db.Integer, db.ForeignKey('platforms.id'), nullable=False)
    user_email = db.Column(db.String(120), nullable=False) # Linked by email to support Nexus Auth
    status = db.Column(db.String(20), default='Pendiente') 
    created_at = db.Column(db.DateTime, default=db.func.now())
    processed_at = db.Column(db.DateTime)

    # Relationships
    platform = db.relationship('Platform', backref=db.backref('requests', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'platform_id': self.platform_id,
            'user_email': self.user_email,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

