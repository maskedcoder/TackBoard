"use strict";
module.exports = function (sequelize, DataTypes) {
    var Post = sequelize.define("Post", {
        title: {
            type: DataTypes.STRING,
            validate: {
                notEmpty: {
                    msg: "Title missing"
                }
            }
        },
        description: {
            type: DataTypes.STRING(3750)
        },
        link: {
            type: DataTypes.STRING,
            validate: {
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