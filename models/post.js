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
            type: DataTypes.STRING(3750),
            validate: {
                notNull: {
                    msg: "Description missing"
                }
            }
        },
        link: {
            type: DataTypes.STRING,
            validate: {
                notNull: {
                    msg: "Link missing"
                },
                notEmpty: {
                    msg: "Link missing"
                },
                isUrl: {
                    msg: "Bad link"
                }
            }
        },
        data: {
            type: DataTypes.TEXT,
            validate: {
                notNull: {
                    msg: "Data missing"
                },
                notEmpty: {
                    msg: "Data missing"
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