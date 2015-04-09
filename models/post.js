"use strict";
module.exports = function (sequelize, DataTypes) {
    var Post = sequelize.define("Post", {
        title: {
            type: DataTypes.STRING,
            validate: {
                notNull: {
                    msg: "Title missing"
                },
                notEmpty: {
                    msg: "Title missing"
                }
            }
        },
        description: {
            type: DataTypes.STRING,
            validate: {
                notNull: {
                    msg: "Description missing"
                },
                notEmpty: {
                    msg: "Description missing"
                }
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