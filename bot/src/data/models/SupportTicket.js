const { DataTypes } = require('sequelize');

/*
 * Support tickets of the Niko Control Center: authorized dashboard users open
 * threads, the owner answers from /admin → Поддержка. Stored in PostgreSQL so
 * nothing is lost between restarts.
 */
const SupportTicket = {
  name: 'SupportTicket',

  init(sequelize) {
    this.model = sequelize.define('SupportTicket', {
      ticketId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: { type: DataTypes.STRING(255), allowNull: false },
      username: { type: DataTypes.STRING(255), allowNull: false },
      avatar: { type: DataTypes.STRING(512), allowNull: true },
      subject: { type: DataTypes.STRING(255), allowNull: false },
      status: {
        type: DataTypes.ENUM('open', 'answered', 'closed'),
        allowNull: false,
        defaultValue: 'open',
      },
      messages: {
        // [{ from: 'user'|'admin', author, text, ts }]
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    }, {
      timestamps: true,
      updatedAt: 'updatedAt',
      indexes: [{ fields: ['userId'] }, { fields: ['status'] }],
    });

    return this.model;
  },

  associate(models) {
    // No associations
  },
};

module.exports = SupportTicket;
