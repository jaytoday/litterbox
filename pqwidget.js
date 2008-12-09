/*
* Quizbox Library 

*/

var iso = function($)
{
	var opts = {}, 
	imgPreloader = new Image, imgTypes = ['png', 'jpg', 'jpeg', 'gif'], 
	loadingTimer, loadingFrame = 1;

        $.plopquiz =
        {
                introItems:
                [
                        {url: '/intro/?page=intro', item_type:'intro', answers: ['Take This Quiz'], noSkip: true, vendor: "Plopquiz"},
                        {url: '/intro/?page=instructions', item_type:'instructions', answers: [ 'dog ate', 'web made' ], noSkip: true},
                        {url: '/intro/?page=instructions2', item_type:'instructions2', answers: [ 'compilers', 'interpreters' ], timed: "instructions2", timeout: 'reset'},
                        {url: '/intro/?page=begin_quiz', item_type:'begin_quiz', answers: [ 'Begin Quiz' ], noSkip: true}
                ],
                quizitemList: Array(),
                currentItem: 3,
                settings:
                {
                        serverUrl: "http://localhost:8080",
                        autoStart: true, // debugging only
                        initDone: false,
                        startTime: (new Date()),
                        timeoutDuration: 20000,
                        proficiencies: Array(),
                        sessionToken: "",
                        instructions:
                        {
                                completed: false,
                                i1complete: false,
                                i2timedOut: false
                        }
                },
                specialTimers:
                {
                        "instructions2": function()
                        {
                        	$("#example_1").hide();
                        	$("#example_2").hide();
                        	$("#example_3").show();
                                
                               // $.plopquiz.specialTimers["instructions2"] = function() {};
                        }
                },
                quizItem: Object(),
                proficiencies:
                [
                        "Freebase",
                        "Building Webapps",
                        "Startup Financing"
                ]
        };

        // this function setups event handlers and ensure everything is setup properly,
        // then call $.plopquiz.start, which actually deals with CSS and loading the quiz
        $.plopquiz.init = function()
        {
                $.ajax({
                        url: $.plopquiz.settings.serverUrl + '/quiz_frame',
                        dataType: "jsonp",
                        success: function(html,status)
                        {
                                $("body").append(html);

                                $("#quiz_overlay").css('height', $(document).height());

                                $('#quiz_wrap')
                                        .bind('quizstarting', function()
                                        {
                                                $(this).show();
                                        })
                                        .bind('quizclosing', function()
                                        {
                                                $(this).hide();

                                                // reset to start of quiz, later this should handle skipping instructions;
                                                $.plopquiz.currentItem = 0;
                                        });

                                $('#quiz_close').click(function()
                                {
                                        $.event.trigger('quizclosing');
                                        
                                        //window.location = "/preview/";
                                });

                                $('#quiz_timer')
                                        .bind('quizItemLoaded', function(event, quizItem)
                                        {
                                                var self = this;
                                                if(!quizItem || !quizItem.timed || $.plopquiz.settings.noTimer)
                                                        return;

                                                // reset and start timer.
                                                var reset = function()
                                                {
                                                      $('.timer_inner', self).stop();
                                                        
                                                        $('.timer_inner', self)
                                                                .css('width', '100%');
                                                                
                                                                if (quizItem.item_type == "quiz_item")
								{
									$.plopquiz.settings.timer_width = $('.timer_bar').width(); // to calculate score
									$('#quiz_answers').find('div').addClass('disabled');
									$('.timer_inner', self).animate({opacity: 1.0}, 2000, function()
									{
										$('#quiz_content').animate({opacity: 1}, 1000);
										$('#quiz_answers').find('div').removeClass('disabled');
									});
								}
                                                                
                                                                $('.timer_inner', self).animate(
                                                                {
                                                                        width: 0
                                                                },
                                                                {
									complete: function()
									{
										if(quizItem.timeout == "reset")
										{
											if(quizItem.timed)
												$.plopquiz.specialTimers[quizItem.timed]();

                                                                                        $(self).stop();
                                                                                        
                                                                                        return reset();
										}

										$.plopquiz.submitAnswer("skip");
									},
									duration: $.plopquiz.settings.timeoutDuration,
									easing: 'linear'
                                                                })
                                                                .show();
						}
                                                reset();
                                        })
                                        .bind('loadingQuizItem', function()
                                        {
                                                $(this).stop();
                                        })
                                        .bind('submitingAnswer', function()
                                        {
                                                $(this).stop();
                                        });

                               
                                //var textHolder = $('#blank').text();
                                var textHolder = '     ';

                                $('#quiz_answers .answer').hover(function()
                                {
                                	if ($(this).attr('id') == 'skip')
						return;

					$('#blank').html($('.answertext', this).text().replace(/\ /g, "&nbsp;"))
					//.css({'padding': '0px 0px'})
					.css({'width': '100px'});                                        
                                },
                                function()
                                {
                                       $('#blank').text(textHolder)
                                       //.css({'padding': '0px 34px'});
                                      .css({'width': '100px'});
                                })
                                .click(function(e)
                                {
                                       $.plopquiz.submitAnswer($(this).find('div.answertext').text().replace(/\n/g,"")); 
                                })
                                .each(function()
                                {
                                        //$(this).attr('href', "#" + $(this).attr('id'));
                                });

                                if($.plopquiz.settings.autoStart)
                                        $.plopquiz.start();
                        }
                });

                $('#pqwidget').click($.plopquiz.start);
        }; // $.plopquiz.init

        $.plopquiz.start = function()
        {
                $.plopquiz.loadItem();
        }; // $.plopquiz.start

        $.plopquiz.loadItem = function(quizItem)
        {
                var quizItem = $.plopquiz.quizItem = ((quizItem && quizItem.answers) ? quizItem : $.plopquiz.fetchNextItem());

                if(!quizItem)
                        return;

                quizItem["url"] = quizItem.url ? quizItem.url : "/quiz_item/?token=" + $.plopquiz.settings.sessionToken;

                $.event.trigger('loadingQuizItem');
                $.ajax({
                        url: $.plopquiz.settings.serverUrl + quizItem.url,
                        dataType: "jsonp",
                        success: function(html, s)
                        {
                                $('#quiz_content').html(html);

                                $('#quiz_answers .answer')
                                        .hide()

                                for ( var i in quizItem.answers )
                                {
					/* some settings... */
					$('#quiz_content').attr('class', quizItem.item_type + '_content');
					$('#quiz_answers').attr('class', quizItem.item_type + '_answers');
					$('#quiz_inner').attr('class', quizItem.item_type + '_quiz_inner');
					$('.quiz_selection').attr('id', quizItem.item_type + '_quiz_selection');
					
					if (quizItem.item_type == 'intro' || quizItem.item_type == 'begin_quiz' || quizItem.item_type == 'quiz_complete'){  
						var this_answer = $('#quiz_answers #confirm');
					}
					else
					{ 
						var this_answer = $('#quiz_answers .answer:eq(' + i + ')'); 
					}

					this_answer
						.show()
						.find('.answertext')
						.html(quizItem.answers[i]);
                                }

                                if(quizItem.timed)
                                        $('#quiz_timer').show();
                                else
                                        $('#quiz_timer').hide();
                               
                                if(!quizItem.noSkip)
                                        $('#skip').show();
                                else
                                        $('#skip').hide();

                                /*
                                 * Setup special cases for instructions here
                                 * does not work well right after ajax load
                                 * and does not allow skipping instruction 1 o 2
                                 */

				if(quizItem.item_type == "intro")
                                {
					if (quizItem.vendor.length > 1){ $('p#employer').find('b').text(quizItem.vendor); }
				}
                                	
                                if(quizItem.item_type == "instructions")
                                {
                                        var i1mouseOverCount = 0;
                                        var i1mouseOver = function()
                                        {
                                                // unbind is to prevent incrementing on the same button
                                                $(this).unbind('mouseover',i1mouseOver);
                                                if(++i1mouseOverCount >= 2)
                                                {
                                                        $('#example_1,#example_2').toggle();
                                                        $.plopquiz.settings.instructions.i1complete = true;
                                                        i1mouseOverCount = null;
                                                }
                                        };

                                        $("#quiz_answers .answer").mouseover(i1mouseOver);
                                }
                                
				if(quizItem.item_type == "instructions2")
                                {
                                       $('a#skip').hide(); 
                                }

                                if(quizItem.item_type == "begin_quiz")
                                {
					var p = {};
                                        for(var i in $.plopquiz.proficiencies)
                                                $("#proficiency_choices")
                                                        .append('<input type="checkbox" value="' + $.plopquiz.proficiencies[i] + '" checked /><span class="proficiency">' + $.plopquiz.proficiencies[i] + '</span><br />');
                                }
                                
                                if(quizItem.item_type == "quiz_item")
                                {
                                        $('#blank').empty();
                                        $('#quiz_content').css({opacity: 0});
                                }

                                if(quizItem.item_type == "quiz_complete")
                                {
                                        $('div#confirm').hide();
                                        // signup binding
                                        $('div.form_proceed').click(function(){
                                                
                                                var current_id  = $(this).attr('id');
                                                var next_id  = parseInt(current_id) + 1;
                                                
                                                if ($('form.signup').find('ul#' + next_id).length == 0)
                                                {
                                                        var args = {};
                                                        var aargs = Array("name", " email", " occupation", " work_status", " webpage", " loc")

                                                        for(var i in aargs)
                                                                args["arg" + i] = "\"" + $("#" + aargs[i]).val() + "\"";

                                                        $.ajax(
                                                        {
                                                                url: $.plopquiz.settings.serverUrl + "/quiztaker/rpc",
                                                                dataType: "jsonp",
                                                                data: $.extend(
                                                                {
                                                                        action: "Register",
                                                                }, args),
                                                                success: function(obj)
                                                                {
                                                                        console.log(obj);
                                                                }
                                                        });

                                                        return;
                                                }

                                                $('form.signup').find('ul#' + current_id).fadeOut(200, function()
                                                {
                                                        $('form.signup').find('ul#' + next_id).fadeIn(200);
                                                });
                                                
                                                $(this).attr('id', next_id);
                                        });      
                                }                

                                $.event.trigger('quizstarting');

                                // short delay to ensure everything is loaded
                                setTimeout(function()
                                {
                                        $.event.trigger('quizItemLoaded', [ quizItem ]);
                                },100);
                        },
                        error: function(xhr,s)
                        {
                                console.log("Ajax error: ", xhr,s);
                        }
                });
        };

        $.plopquiz.submitAnswer = function(answer)
        {
                $.event.trigger("submitingAnswer");
                // check the answer for special cases
                // this will handle the non-skiping timeout on instructions2,
                // the proficiencies, the score, and any other special boxes
                switch($.plopquiz.quizItem.item_type)
                {
                        case "instructions":
                                if(!$.plopquiz.settings.instructions.i1complete)
                                        return;
                                else
                                        $.plopquiz.loadItem();
                        break;

                        case "instructions2":
                                if(!$.plopquiz.settings.instructions.skip_segment)
                                {
                                        $.plopquiz.settings.instructions.i2timedOut = true;
                                        $('.timer_bar').stop();
                                        $('.timer_bar').css('width', '100%'); 
                                        $('#example_1,#example_3').hide('slow');
                                        $('#example_2').show('slow');
                                        $('a#skip').show();
                                        //click binding
                                        $('#quiz_answers').find('#answer1,#answer2').addClass('disabled');
                                        $.plopquiz.settings.instructions.skip_segment = "true";

                                        return;
                                }
                                else
                                        $.plopquiz.loadItem();
                                       $('#quiz_answers').find('#answer1,#answer2').removeClass('disabled');
                        break;

                        case "begin_quiz":
                                // clear out proficiencies in case its a restart
                                $.plopquiz.settings.proficiencies = Array();

                                $('#proficiency_choices input:checked').each(function() { $.plopquiz.settings.proficiencies.push($(this).val()); });
                                $('.timer_bar').css('width', '100%'); 

                                $.ajax(
                                {
                                        url: $.plopquiz.settings.serverUrl + "/quiztaker/rpc",
                                        dataType: "jsonp",
                                        data:
                                        {
                                                action: "start_quiz",
                                                arg0: "[\"" + $.plopquiz.settings.proficiencies.join("\",\"") + "\"]"
                                        },
                                        success: function(rpc)
                                        {
                                                if(rpc.token)
                                                        $.plopquiz.settings.sessionToken = rpc.token;

                                                // reset the proficiencies here incase the server returns something different
                                                if(rpc.proficiencies)
                                                        $.plopquiz.proficiencies = rpc.proficiencies;

                                                $.plopquiz.settings.instructions.completed = true;

                                                $.plopquiz.loadItem();
                                        }
                                });
                        break;

                        case "quiz_item":
                                // ajax call to submit -- (answer, key, vendor)
                                var this_item = $.plopquiz.quizItem;
                                var timer_status = $('.timer_bar').width()/$.plopquiz.settings.timer_width;

                                $.ajax(
                                {
                                        url: $.plopquiz.settings.serverUrl + "/quiztaker/rpc",
                                        dataType: "jsonp",
                                        data:
                                        {
                                                action: "continue_quiz",
                                                arg0: "\"" + answer + "\"",
                                                arg1: timer_status,
                                                arg2: "\"" + $.plopquiz.settings.sessionToken + "\"",
                                                arg3: "\"\""
                                        },
                                        success: function(obj)
                                        {
                                                var q = obj["quiz_item"];

                                                if(q === false)
                                                {
                                                        return $.plopquiz.loadItem({url: "/intro/?page=quiz_complete", item_type:"quiz_complete", noSkip: true, answers: [ "Submit" ]});
                                                }

                                                $.plopquiz.loadItem($.extend({timed:true,"item_type":"quiz_item"}, q));
                                        }
                                });

                                $('.timer_bar').css('width', '100%');
                        break;
                        
                        case "quiz_complete":
                        break;
                        
                        default:
                                $.plopquiz.loadItem();
                        break;
                };
        };

        $.plopquiz.fetchNextItem = function()
        {
                if($.plopquiz.settings.instructions.completed == false)
                        return $.plopquiz.introItems[$.plopquiz.currentItem++];

                return {
                        "url": "/quiz_item/?token=" + $.plopquiz.settings.sessionToken,
                        "item_type": "quiz_item",
                        "answers": $.plopquiz.proficiencies.answers,
                        "timed": true
                };
        }

        $(function()
        {
                $.plopquiz.init();
        });
};

var pqjs = document.getElementsByTagName("script");
pqjs = pqjs[pqjs.length - 1];

function addScript(src)
{
        var s = document.createElement("script");
        s.src = src;
        s.rel = "javascript";
        s.type = "text/javascript";
        pqjs.parentNode.appendChild(s);
}

function addStyle(src)
{
        var s = document.createElement("link");
        s.href = src;
        s.rel = "stylesheet";
        s.type = "text/css";
        pqjs.parentNode.appendChild(s);
}

if(window.jQuery)
{
        pqLoad();
}
else
{
        addScript("/pqwidget/jquery.js");
        addStyle("/pqwidget/pqwidget.css");

        setTimeout(waitForJQ, 60);
}

function waitForJQ()
{
        if(window.jQuery)
                pqLoad();
        else
                setTimeout(waitForJQ, 60);
}

function pqLoad()
{
        jQuery.isReady = true;
        iso(jQuery);
}
