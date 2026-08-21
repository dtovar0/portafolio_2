from app import db

class Area(db.Model):
    __tablename__ = 'areas'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    icon = db.Column(db.String(50), default='box')
    color = db.Column(db.String(100), default='#6366f1')
    status = db.Column(db.String(20), default='Activo')

    @property
    def color_rgb(self):
        """Converts hex color to RGB comma-separated string for CSS variables."""
        hex_color = self.color.lstrip('#')
        if len(hex_color) == 3:
            hex_color = ''.join([c*2 for c in hex_color])
        try:
            r = int(hex_color[0:2], 16)
            g = int(hex_color[2:4], 16)
            b = int(hex_color[4:6], 16)
            return f"{r}, {g}, {b}"
        except:
            return "99, 102, 241" # Default Indigo-500

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
            'area_name': self.area.name if self.area else 'Sin Área',
            'area_color': self.area.color if self.area else '#6366f1',
            'area_icon': self.area.icon if self.area else 'box',
            'user_ids': [u.id for u in self.platform_users.all()] if hasattr(self, 'platform_users') else []
        }
