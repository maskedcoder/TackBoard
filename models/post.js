"use strict";
module.exports = function (sequelize, DataTypes) {
    var Post = sequelize.define("Post", {
        title: {
            type: DataTypes.STRING,
            validate: {
                notNull: true,
                notEmpty: true
            }
        },
        description: {
            type: DataTypes.STRING,
            validate: {
                notNull: true,
                notEmpty: true
            }
        }
    }, {
        classMethods: {
            associate: function (models) {
                Post.belongsTo(models.User, {onDelete: 'CASCADE', onUpdate: 'CASCADE'});
            }
        }
    });
    return Post;
};