"use strict";

module.exports = {
    up: function (migration, DataTypes, done) {
        migration.addColumn(
        'Post',
        'UserId',
        {
            type: DataTypes.INTEGER,
            allowNull: false,
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        }
    )
        done();
    },

    down: function (migration, DataTypes, done) {
        migration.removeColumn('Post', 'UserId');
        done();
    }
};
